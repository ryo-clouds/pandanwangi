const { HNSWLib } = require("@langchain/community/vectorstores/hnswlib");
const { HuggingFaceInferenceEmbeddings } = require("@langchain/community/embeddings/hf");
const path = require("path");
const fs = require("fs");

// Mock config or load from .env if needed, but for now just try to load if directory exists
// Assuming 'data/vector_store' exists
const directory = path.resolve(__dirname, "../data/vector_store");

(async () => {
    try {
        if (!fs.existsSync(path.join(directory, "args.json"))) {
            console.log("No vector store found to test.");
            return;
        }

        const embeddings = new HuggingFaceInferenceEmbeddings({
            apiKey: "dummy", // Not needed for loading usually/inspection? actually load might need it for type check
            model: "intfloat/multilingual-e5-large"
        });

        console.log("Loading HNSWLib...");
        const store = await HNSWLib.load(directory, embeddings);
        
        console.log("Store keys:", Object.keys(store));
        if (store.docstore) {
            console.log("Docstore found!");
            console.log("Docstore keys:", Object.keys(store.docstore));
            // Check if we can get all docs. 
            // In-memory docstore typically has _docs map
            if (store.docstore._docs) {
                 console.log("Docstore _docs size:", store.docstore._docs.size);
                 const firstDoc = store.docstore._docs.values().next().value;
                 console.log("First doc:", firstDoc);
            }
        } else {
            console.log("No docstore property found.");
        }

    } catch (e) {
        console.error("Error:", e);
    }
})();
