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

export const addDocuments = async (docs: any[]) => {
    let store = await getVectorStore();
    
    // Create new store/add documents
    if (store) {
        await store.addDocuments(docs);
    } else {
        // Fallback (should typically use existing index)
        store = await SupabaseVectorStore.fromDocuments(docs, embeddings, {
            client: supabase,
            tableName: "document_chunks",
            queryName: "match_documents",
        });
        vectorStore = store;
    }
    
    // Rebuild BM25 immediately after adding documents
    // In production, this might be async or scheduled
    // For now, we reuse the loading logic or just update local instance if possible
    // Simpler to just re-load for consistency
    await loadStores();
    
    return store;
};
