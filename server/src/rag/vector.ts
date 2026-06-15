import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
import { BM25Retriever } from "@langchain/community/retrievers/bm25";
import { Document } from "@langchain/core/documents";
import { config } from "../config";
import { supabase } from "../lib/supabase";

export const embeddings = new HuggingFaceInferenceEmbeddings({
  apiKey: config.hfToken,
  model: "intfloat/multilingual-e5-large"
});

// Singleton state
let vectorStore: SupabaseVectorStore | null = null;
let bm25Retriever: BM25Retriever | null = null;

const loadStores = async () => {
    try {
        console.log("Connecting to Supabase Vector Store...");
        // Initialize Supabase Vector Store
        vectorStore = await SupabaseVectorStore.fromExistingIndex(embeddings, {
            client: supabase,
            tableName: "document_chunks",
            queryName: "match_documents",
        });

        console.log("✅ Supabase Vector Store initialized.");

        // REBUILD BM25 INDEX (Optional but recommended for hybrid search sync)
        // Fetch all documents from Supabase to build local BM25 index
        // Note: With large datasets, this might be slow. Consider optimizing later.
        console.log("Fetching chunks for BM25...");
        const { data: allChunks, error } = await supabase
            .from('document_chunks')
            .select('content, metadata');
            
        if (error) {
            console.error("❌ Error fetching chunks for BM25:", error);
        } else if (allChunks && allChunks.length > 0) {
            console.log(`Building BM25 Index with ${allChunks.length} chunks from Supabase...`);
            
            const docs = allChunks.map(chunk => new Document({
                pageContent: chunk.content,
                metadata: chunk.metadata as Record<string, any>
            }));

            bm25Retriever = BM25Retriever.fromDocuments(docs, { k: 10 });
            console.log("✅ BM25 Index built.");
        } else {
            console.log("⚠️ No documents found in Supabase for BM25 index.");
        }
    } catch (e: any) {
        console.error("❌ CRITICAL ERROR in loadStores:", e.message || e);
        // Do not throw, allow server to start even if vector store fails (will fail later on query)
    }
};

export const getVectorStore = async () => {
    if (!vectorStore) {
        console.log("Vector store not initialized, loading...");
        await loadStores();
    }
    return vectorStore;
};

// Reciprocal Rank Fusion
const reciprocalRankFusion = (results: Document[][], k = 60): Document[] => {
    const fusedScores: Record<string, number> = {};
    const docMap: Record<string, Document> = {};

    results.forEach((docs) => {
        docs.forEach((doc, rank) => {
            const docStr = JSON.stringify(doc.pageContent); // Simple dedupe key
            docMap[docStr] = doc;
            if (!fusedScores[docStr]) fusedScores[docStr] = 0;
            fusedScores[docStr] += 1 / (rank + k);
        });
    });

    return Object.entries(fusedScores)
        .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
        .map(([docStr]) => docMap[docStr]);
};

// Hybrid Retriever
export const getHybridRetriever = async () => {
    await getVectorStore(); // Ensure loaded

    return {
        invoke: async (query: string, k = 10): Promise<Document[]> => {
            const promises: Promise<Document[]>[] = [];
            
            // 1. Vector Search
            if (vectorStore) {
                promises.push(vectorStore.similaritySearch(query, k));
            } else {
                promises.push(Promise.resolve([]));
            }

            // 2. BM25 Search
            if (bm25Retriever) {
                promises.push(bm25Retriever.invoke(query));
            } else {
                promises.push(Promise.resolve([]));
            }

            const results = await Promise.all(promises);
            const fused = reciprocalRankFusion(results);
            
            // Return top K
            return fused.slice(0, k);
        }
    };
};

// Helper function for delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const addDocuments = async (docs: any[], onProgress?: (current: number, total: number) => void) => {
    let store = await getVectorStore();
    
    const BATCH_SIZE = 20; // Process 20 chunks at a time
    const DELAY_MS = 2000; // 2 second delay between batches
    const totalDocs = docs.length;
    
    console.log(`📄 Processing ${totalDocs} chunks in batches of ${BATCH_SIZE}...`);
    
    // Create new store/add documents in batches
    if (store) {
        for (let i = 0; i < docs.length; i += BATCH_SIZE) {
            const batch = docs.slice(i, i + BATCH_SIZE);
            const batchNum = Math.floor(i / BATCH_SIZE) + 1;
            const totalBatches = Math.ceil(docs.length / BATCH_SIZE);
            
            console.log(`📦 Batch ${batchNum}/${totalBatches}: Processing ${batch.length} chunks...`);
            
            try {
                await store.addDocuments(batch);
                console.log(`✅ Batch ${batchNum}/${totalBatches} complete`);
                
                // Report progress
                if (onProgress) {
                    onProgress(Math.min(i + BATCH_SIZE, totalDocs), totalDocs);
                }
                
                // Add delay between batches to avoid rate limiting (except for last batch)
                if (i + BATCH_SIZE < docs.length) {
                    console.log(`⏳ Waiting ${DELAY_MS}ms before next batch...`);
                    await delay(DELAY_MS);
                }
            } catch (error: any) {
                console.error(`❌ Batch ${batchNum} failed:`, error.message);
                
                // Retry with smaller batch on failure
                if (BATCH_SIZE > 5) {
                    console.log(`🔄 Retrying batch ${batchNum} with smaller chunks...`);
                    const RETRY_BATCH_SIZE = 5;
                    
                    for (let j = 0; j < batch.length; j += RETRY_BATCH_SIZE) {
                        const smallBatch = batch.slice(j, j + RETRY_BATCH_SIZE);
                        try {
                            await store.addDocuments(smallBatch);
                            console.log(`   ✅ Sub-batch ${Math.floor(j / RETRY_BATCH_SIZE) + 1} complete`);
                            await delay(3000); // Longer delay for retry
                        } catch (retryError: any) {
                            console.error(`   ❌ Sub-batch failed:`, retryError.message);
                            throw retryError; // Give up after retry
                        }
                    }
                } else {
                    throw error;
                }
            }
        }
    } else {
        // Fallback - create new store with first batch only
        const firstBatch = docs.slice(0, BATCH_SIZE);
        store = await SupabaseVectorStore.fromDocuments(firstBatch, embeddings, {
            client: supabase,
            tableName: "document_chunks",
            queryName: "match_documents",
        });
        vectorStore = store;
        
        // Add remaining docs
        if (docs.length > BATCH_SIZE) {
            const remaining = docs.slice(BATCH_SIZE);
            for (let i = 0; i < remaining.length; i += BATCH_SIZE) {
                const batch = remaining.slice(i, i + BATCH_SIZE);
                console.log(`📦 Adding batch ${Math.floor(i / BATCH_SIZE) + 2}...`);
                await store.addDocuments(batch);
                await delay(DELAY_MS);
            }
        }
    }
    
    console.log(`🎉 All ${totalDocs} chunks processed successfully!`);
    
    // Rebuild BM25 immediately after adding documents
    await loadStores();
    
    return store;
};
