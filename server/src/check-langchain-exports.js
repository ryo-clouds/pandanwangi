try {
    const { BM25Retriever } = require('@langchain/community/retrievers/bm25');
    console.log('BM25Retriever found:', !!BM25Retriever);
} catch (e) {
    console.log('BM25Retriever NOT found in @langchain/community/retrievers/bm25');
}

try {
    const { EnsembleRetriever } = require('langchain/retrievers/ensemble');
    console.log('EnsembleRetriever found (langchain/retrievers/ensemble):', !!EnsembleRetriever);
} catch (e) {
    try {
        const { EnsembleRetriever } = require('@langchain/community/retrievers/ensemble');
         console.log('EnsembleRetriever found (@langchain/community/retrievers/ensemble):', !!EnsembleRetriever);
    } catch (e2) {
        console.log('EnsembleRetriever NOT found');
    }
}
