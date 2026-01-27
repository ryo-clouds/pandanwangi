const { BM25Retriever } = require('@langchain/community/retrievers/bm25');
const { Document } = require('@langchain/core/documents');

(async () => {
    try {
        console.log('Instantiating BM25Retriever...');
        const retriever = BM25Retriever.fromDocuments(
            [new Document({ pageContent: "Test" })],
            { k: 1 }
        );
        console.log('Instantiated successfully:', !!retriever);
    } catch (e) {
        console.log('Error instantiating BM25Retriever:', e.message);
        if (e.code === 'MODULE_NOT_FOUND') {
             console.log('Missing module:', e);
        }
    }
})();
