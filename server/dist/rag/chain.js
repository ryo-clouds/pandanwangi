"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.askQuestionStream = exports.askQuestion = void 0;
const inference_1 = require("@huggingface/inference");
const config_1 = require("../config");
const vector_1 = require("./vector");
const database_1 = require("../lib/database");
const client = new inference_1.InferenceClient(config_1.config.hfToken);
// Detect if the question is a comparison query
const isComparisonQuery = (question) => {
    const comparisonKeywords = [
        'bandingkan', 'perbandingan', 'dibandingkan', 'banding',
        'perbedaan', 'berbeda', 'bedanya', 'vs', 'versus',
        'tahun lalu', 'tahun sebelumnya', 'tahun ini',
        'naik', 'turun', 'meningkat', 'menurun', 'perubahan',
        '2023', '2024', '2022', '2021', '2020'
    ];
    const lowerQ = question.toLowerCase();
    return comparisonKeywords.some(kw => lowerQ.includes(kw));
};
// Extract years mentioned in the question
const extractYearsFromQuestion = (question) => {
    const yearMatches = question.match(/20\d{2}/g);
    return yearMatches ? [...new Set(yearMatches)] : [];
};
// Return full response (Atomic)
const askQuestion = async (question, sessionId) => {
    const iterator = (0, exports.askQuestionStream)(question, sessionId);
    let fullAnswer = "";
    let sources = [];
    for await (const chunk of iterator) {
        try {
            const parsed = JSON.parse(chunk);
            if (parsed.type === 'content') {
                fullAnswer += parsed.data;
            }
            else if (parsed.type === 'sources') {
                sources = parsed.data;
            }
        }
        catch (e) {
            console.error("Parse error in askQuestion:", e);
        }
    }
    return { answer: fullAnswer, sources };
};
exports.askQuestion = askQuestion;
// Return an Async Generator for Streaming
const askQuestionStream = async function* (question, sessionId) {
    const retriever = await (0, vector_1.getHybridRetriever)();
    // 1. Retrieve & Context (Same as before)
    console.log(`Retrieving context (Hybrid Mode) for: ${question}`);
    let allDocs = [];
    const isComparison = isComparisonQuery(question);
    const mentionedYears = extractYearsFromQuestion(question);
    if (isComparison && mentionedYears.length > 0) {
        for (const year of mentionedYears) {
            const yearDocs = await retriever.invoke(`${question} tahun ${year}`, 15);
            allDocs.push(...yearDocs);
        }
        const generalDocs = await retriever.invoke(question, 15);
        allDocs.push(...generalDocs);
    }
    else {
        allDocs = await retriever.invoke(question, 25);
    }
    // Deduplicate by Content
    let uniqueDocs = Array.from(new Set(allDocs.map(d => d.pageContent)))
        .map(content => allDocs.find(d => d.pageContent === content))
        .filter((d) => d !== undefined);
    // Prioritize Diversity: Ensure we don't just fill up with 10 chunks from same file
    const seenFiles = new Set();
    const diverseDocs = [];
    const remainingDocs = [];
    // First pass: 1 chunk per file
    uniqueDocs.forEach(doc => {
        const source = doc.metadata.source || doc.metadata.filename;
        if (!seenFiles.has(source)) {
            diverseDocs.push(doc);
            seenFiles.add(source);
        }
        else {
            remainingDocs.push(doc);
        }
    });
    // Fill up to 15 with remaining best matches
    const finalDocs = [...diverseDocs, ...remainingDocs].slice(0, 15);
    const context = finalDocs.map(d => {
        const yearLabel = d.metadata?.year ? `[Tahun ${d.metadata.year}] ` : '';
        const pageLabel = d.metadata?.pageNumber ? `(Page ${d.metadata.pageNumber}) ` : '';
        return `source: ${d.metadata?.filename || 'doc'} ${pageLabel}\n${yearLabel}${d.pageContent}`;
    }).join("\n\n---\n\n");
    // 2. Memory (Same as before)
    let conversationHistory = "";
    if (sessionId) {
        const sessionMessages = await (0, database_1.getSessionMessages)(sessionId);
        const recentMessages = sessionMessages.slice(-6);
        conversationHistory = recentMessages
            .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
            .join('\n');
    }
    const memories = await (0, database_1.getMemories)(10);
    const memoryFacts = memories.map(m => `- ${m.fact}`).join('\n');
    // 3. System Prompt
    const comparisonInstruction = isComparison
        ? `\nFORMAT TASK: The user asked for a comparison. You MUST output the data as a MARKDOWN TABLE.`
        : '';
    const systemPrompt = `You are the official AI Assistant for Pemerintah Kabupaten Cianjur (Cianjur Regency Government).
Your goal is to answer questions ACCURATELY based ONLY on the provided Context.

<|instructions|>
1. **Source of Truth**: Answer ONLY using the information in the 'Document Context'.
2. **Citations**: Create citations if possible.
3. **No Hallucination**: If the answer is not in the context, strictly reply: "Maaf, saya tidak menemukan informasi tersebut dalam dokumen yang tersedia."
4. **Tone**: Professional, formal, and helpful Indonesian government official.
${comparisonInstruction}
</|instructions|>

<|context|>
${context}
</|context|>

<|memory|>
${memoryFacts}
</|memory|>

<|recent_history|>
${conversationHistory}
</|recent_history|>

Answer the user's question now.`;
    // 4. Yield Sources First (as a special chunk)
    const sources = finalDocs.map((doc) => ({
        page: doc.metadata.pageNumber ?? '?',
        source: doc.metadata.source ?? 'Unknown',
        year: doc.metadata?.year ?? '?'
    }));
    yield JSON.stringify({ type: 'sources', data: sources });
    // 5. Stream LLM Response
    console.log(`Invoking LLM Stream...`);
    let hasContent = false;
    try {
        const stream = await client.chatCompletionStream({
            model: config_1.config.modelRepo,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: question }
            ],
            temperature: 0.5,
            max_tokens: 3000
        });
        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
                hasContent = true;
                yield JSON.stringify({ type: 'content', data: content });
            }
        }
        // Fallback if LLM yields absolutely nothing
        if (!hasContent) {
            const fallback = "Maaf, saya tidak dapat memberikan jawaban saat ini (Tidak ada respon dari AI).";
            yield JSON.stringify({ type: 'content', data: fallback });
        }
    }
    catch (error) {
        console.error("LLM Stream Error:", error);
        throw error;
    }
};
exports.askQuestionStream = askQuestionStream;
