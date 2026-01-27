
import { config } from '../src/config';
import { supabase, downloadFromStorage } from '../src/lib/supabase';
import { processPdf } from '../src/rag/loader';
import { addDocuments } from '../src/rag/vector';
import { getDocuments } from '../src/lib/database';

// Helper delay to avoid rate limits
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function migrateVectors() {
    console.log("🚀 Starting Vector Migration to Supabase...");
    
    // 1. Get all documents
    const documents = await getDocuments();
    console.log(`📊 Found ${documents.length} documents in database.`);

    let successCount = 0;
    let failCount = 0;

    for (const doc of documents) {
        console.log(`\n--------------------------------------------------`);
        console.log(`Processing: ${doc.filename} (ID: ${doc.id})`);

        if (!doc.storage_path) {
            console.error(`❌ Skipped: No storage path`);
            failCount++;
            continue;
        }

        try {
            // 2. Download file
            console.log(`📥 Downloading from: ${doc.storage_path}`);
            const fileBuffer = await downloadFromStorage(doc.storage_path);
            
            // 3. Process PDF (Extract text & chunks)
            // Note: processPdf ALREADY saves to the vector store (Supabase) via addDocuments internally
            console.log(`⚙️  Parsing & Chunking...`);
            const result = await processPdf(fileBuffer, doc.storage_path, doc.filename);
            
            if (!result.success || result.chunks === 0) {
                console.warn(`⚠️  No chunks generated for this document.`);
                failCount++;
                continue;
            }

            console.log(`💾 Saved ${result.chunks} chunks to Supabase Vector Store (handled by processPdf)`);
            
            // 4. Update chunk count in metadata if changed
            if (doc.chunks_count !== result.chunks) {
                console.log(`📝 Updating metadata (chunks: ${doc.chunks_count} -> ${result.chunks})`);
                await supabase
                    .from('documents')
                    .update({ 
                        chunks_count: result.chunks,
                        is_indexed: true 
                    })
                    .eq('id', doc.id);
            }

            console.log(`✅ Success!`);
            successCount++;

            // Rate limit pause for embeddings API
            await delay(1000); 

        } catch (error: any) {
            console.error(`❌ Failed:`, error.message);
            failCount++;
        }
    }

    console.log(`\n==================================================`);
    console.log(`🎉 Migration Completed!`);
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`==================================================\n`);
}

// Execute
migrateVectors().catch(console.error);
