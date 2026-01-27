"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addDocuments = exports.getHybridRetriever = exports.getVectorStore = exports.embeddings = void 0;
const hnswlib_1 = require("@langchain/community/vectorstores/hnswlib");
const hf_1 = require("@langchain/community/embeddings/hf");
const bm25_1 = require("@langchain/community/retrievers/bm25");
const config_1 = require("../config");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const directory = path_1.default.resolve(config_1.config.vectorStorePath);
if (!fs_1.default.existsSync(directory)) {
    fs_1.default.mkdirSync(directory, { recursive: true });
}
exports.embeddings = new hf_1.HuggingFaceInferenceEmbeddings({
    apiKey: config_1.config.hfToken,
    model: "intfloat/multilingual-e5-large"
});
// Singleton state
let vectorStore = null;
let bm25Retriever = null;
const loadStores = async () => {
    if (fs_1.default.existsSync(path_1.default.join(directory, "args.json"))) {
        vectorStore = await hnswlib_1.HNSWLib.load(directory, exports.embeddings);
        // Rebuild BM25 from HNSW docstore to keep in sync
        if (vectorStore?.docstore) {
            // Access internal docstore to get all documents
            // @ts-ignore - _docs is private/internal
            const allDocs = Array.from(vectorStore.docstore._docs.values());
            if (allDocs.length > 0) {
                console.log(`Building BM25 Index with ${allDocs.length} documents...`);
                bm25Retriever = bm25_1.BM25Retriever.fromDocuments(allDocs, { k: 10 });
            }
        }
    }
};
const getVectorStore = async () => {
    if (!vectorStore)
        await loadStores();
    return vectorStore;
};
exports.getVectorStore = getVectorStore;
// Reciprocal Rank Fusion
const reciprocalRankFusion = (results, k = 60) => {
    const fusedScores = {};
    const docMap = {};
    results.forEach((docs) => {
        docs.forEach((doc, rank) => {
            const docStr = JSON.stringify(doc.pageContent); // Simple dedupe key
            docMap[docStr] = doc;
            if (!fusedScores[docStr])
                fusedScores[docStr] = 0;
            fusedScores[docStr] += 1 / (rank + k);
        });
    });
    return Object.entries(fusedScores)
        .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
        .map(([docStr]) => docMap[docStr]);
};
// Hybrid Retriever
const getHybridRetriever = async () => {
    await (0, exports.getVectorStore)(); // Ensure loaded
    return {
        invoke: async (query, k = 10) => {
            const promises = [];
            // 1. Vector Search
            if (vectorStore) {
                promises.push(vectorStore.similaritySearch(query, k));
            }
            else {
                promises.push(Promise.resolve([]));
            }
            // 2. BM25 Search
            if (bm25Retriever) {
                // BM25Retriever uses instance-level 'k' set during init
                // If dynamic k is needed, we would need to create a new retriever or update property
                // For now, rely on init k=10
                promises.push(bm25Retriever.invoke(query));
            }
            else {
                promises.push(Promise.resolve([]));
            }
            const results = await Promise.all(promises);
            const fused = reciprocalRankFusion(results);
            // Return top K
            return fused.slice(0, k);
        }
    };
};
exports.getHybridRetriever = getHybridRetriever;
const addDocuments = async (docs) => {
    let store = await (0, exports.getVectorStore)();
    if (store) {
        await store.addDocuments(docs);
    }
    else {
        store = await hnswlib_1.HNSWLib.fromDocuments(docs, exports.embeddings);
        vectorStore = store; // Update singleton
    }
    await store.save(directory);
    // Rebuild BM25 immediately
    // @ts-ignore
    const allDocs = Array.from(store.docstore._docs.values());
    bm25Retriever = bm25_1.BM25Retriever.fromDocuments(allDocs, { k: 10 });
    return store;
};
exports.addDocuments = addDocuments;
