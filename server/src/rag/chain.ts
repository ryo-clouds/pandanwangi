import { InferenceClient } from "@huggingface/inference";
import { config } from "../config";
import { getHybridRetriever } from "./vector";
import { getSessionMessages, getMemories } from "../lib/database";
import { Document } from "@langchain/core/documents"; // Ensure type present

const client = new InferenceClient(config.hfToken);

// Detect if the question is a comparison query
const isComparisonQuery = (question: string): boolean => {
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
const extractYearsFromQuestion = (question: string): string[] => {
    const yearMatches = question.match(/20\d{2}/g);
    return yearMatches ? [...new Set(yearMatches)] : [];
};

// Return full response (Atomic)
export const askQuestion = async (question: string, sessionId?: string): Promise<{ answer: string, sources: any[] }> => {
    const iterator = askQuestionStream(question, sessionId);
    let fullAnswer = "";
    let sources: any[] = [];

    for await (const chunk of iterator) {
        try {
            const parsed = JSON.parse(chunk);
            if (parsed.type === 'content') {
                fullAnswer += parsed.data;
            } else if (parsed.type === 'sources') {
                sources = parsed.data;
            }
        } catch (e) {
            console.error("Parse error in askQuestion:", e);
        }
    }

    return { answer: fullAnswer, sources };
};

// WhatsApp-specific function with friendly, conversational formatting
export const askQuestionWhatsApp = async (question: string, sessionId?: string): Promise<{ answer: string, sources: any[] }> => {
    console.log(`[askQuestionWhatsApp] Starting for query: "${question}"`);
    
    try {
        const retriever = await getHybridRetriever();
        
        // Retrieve context
        const isComparison = isComparisonQuery(question);
        const mentionedYears = extractYearsFromQuestion(question);
        let allDocs: Document[] = [];
        
        if (isComparison && mentionedYears.length > 0) {
            for (const year of mentionedYears) {
                const yearDocs = await retriever.invoke(`${question} tahun ${year}`, 25);
                allDocs.push(...yearDocs);
            }
            const generalDocs = await retriever.invoke(question, 30);
            allDocs.push(...generalDocs);
        } else {
            allDocs = await retriever.invoke(question, 50);
        }
        
        // Deduplicate
        let uniqueDocs = Array.from(new Set(allDocs.map(d => d.pageContent)))
            .map(content => allDocs.find(d => d.pageContent === content))
            .filter((d): d is Document => d !== undefined);
        
        // Diversity: 1 chunk per file first
        const seenFiles = new Set<string>();
        const diverseDocs: Document[] = [];
        const remainingDocs: Document[] = [];
        
        uniqueDocs.forEach(doc => {
            const source = doc.metadata.source || doc.metadata.filename;
            if (!seenFiles.has(source)) {
                diverseDocs.push(doc);
                seenFiles.add(source);
            } else {
                remainingDocs.push(doc);
            }
        });
        
        const finalDocs = [...diverseDocs, ...remainingDocs].slice(0, 10); // Fewer docs for WhatsApp
        
        const context = finalDocs.map(d => {
            return `[${d.metadata?.filename || 'doc'}] ${d.pageContent}`;
        }).join("\n\n");
        
        // Conversation history for WhatsApp
        let conversationHistory = "";
        if (sessionId) {
            const sessionMessages = await getSessionMessages(sessionId);
            const recentMessages = sessionMessages.slice(-4); // Shorter history for WA
            conversationHistory = recentMessages
                .map(m => `${m.role === 'user' ? 'Kamu' : 'Aku'}: ${m.content}`)
                .join('\n');
        }
        
        // WhatsApp-specific FRIENDLY system prompt
        const systemPrompt = `Kamu adalah Asisten AI Pemerintah Kabupaten Cianjur yang membalas pesan WhatsApp.

ATURAN PENTING:
1. Balas dengan gaya CASUAL & FRIENDLY seperti chatting sama teman
2. JANGAN gunakan format markdown, tabel, atau bullet points yang rumit
3. Gunakan emoji secukupnya biar lebih hidup 😊
4. Jawab SINGKAT dan TO THE POINT (max 3-4 paragraf pendek)
5. Kalau ada daftar, tulis dengan kalimat biasa, jangan pakai * atau -
6. JANGAN sebutkan nama file sumber secara eksplisit
7. Kalau tidak tahu, bilang aja "Wah, untuk itu aku belum punya infonya nih 🙏"
8. Pakai bahasa Indonesia yang santai tapi tetap sopan

KONTEKS INFORMASI:
${context}

RIWAYAT CHAT:
${conversationHistory}

Ingat: Kamu sedang chatting di WhatsApp, bukan bikin laporan formal!`;

        // Call LLM
        const response = await client.chatCompletion({
            model: config.modelRepo,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: question }
            ],
            temperature: 0.7, // Slightly higher for more natural responses
            max_tokens: 1000 // Shorter for WhatsApp
        });
        
        const answer = response.choices[0]?.message?.content || "Maaf, aku nggak bisa jawab sekarang 🙏";
        
        const sources = finalDocs.map((doc: any) => ({
            page: doc.metadata.pageNumber ?? '?',
            source: doc.metadata.source ?? 'Unknown'
        }));
        
        return { answer, sources };
        
    } catch (error: any) {
        console.error("❌ Error in askQuestionWhatsApp:", error);
        return { 
            answer: "Waduh, ada error nih 😅 Coba tanya lagi ya!", 
            sources: [] 
        };
    }
};

// Return an Async Generator for Streaming
export const askQuestionStream = async function* (question: string, sessionId?: string) {
    console.log(`[askQuestionStream] Starting for query: "${question}"`);
    
    try {
        const retriever = await getHybridRetriever();
        
        // 1. Retrieve & Context (Same as before)
        console.log(`Retrieving context (Hybrid Mode) for: ${question}`);
        let allDocs: Document[] = [];
        const isComparison = isComparisonQuery(question);
        const mentionedYears = extractYearsFromQuestion(question);
        
        if (isComparison && mentionedYears.length > 0) {
            for (const year of mentionedYears) {
                const yearDocs = await retriever.invoke(`${question} tahun ${year}`, 25);
                allDocs.push(...yearDocs);
            }
            const generalDocs = await retriever.invoke(question, 30);
            allDocs.push(...generalDocs);
        } else {
            // Broad search to satisfy "read all documents" request
            allDocs = await retriever.invoke(question, 50);
        }
        
        console.log(`[askQuestionStream] Retrieved ${allDocs.length} raw documents.`);
        
        // Deduplicate by Content
        let uniqueDocs = Array.from(new Set(allDocs.map(d => d.pageContent)))
            .map(content => allDocs.find(d => d.pageContent === content))
            .filter((d): d is Document => d !== undefined);
            
        // Prioritize Diversity: Ensure we don't just fill up with 10 chunks from same file
        const seenFiles = new Set<string>();
        const diverseDocs: Document[] = [];
        const remainingDocs: Document[] = [];
        
        // First pass: 1 chunk per file
        uniqueDocs.forEach(doc => {
            const source = doc.metadata.source || doc.metadata.filename;
            if (!seenFiles.has(source)) {
                diverseDocs.push(doc);
                seenFiles.add(source);
            } else {
                remainingDocs.push(doc);
            }
        });
        
        // Fill up to 15 with remaining best matches
        const finalDocs = [...diverseDocs, ...remainingDocs].slice(0, 15);

        // === VERBOSE LOGGING FOR DEBUGGING ===
        console.log(`\n=== RETRIEVAL DEBUG ===`);
        console.log(`Query: "${question}"`);
        console.log(`Total docs retrieved: ${allDocs.length}`);
        console.log(`Unique docs: ${uniqueDocs.length}`);
        console.log(`Final docs to use: ${finalDocs.length}`);
        console.log(`Docs by filename:`);
        finalDocs.forEach((doc, i) => {
            const filename = doc.metadata?.filename || 'unknown';
            const preview = doc.pageContent?.substring(0, 100).replace(/\n/g, ' ') || 'no content';
            console.log(`  ${i + 1}. [${filename}] "${preview}..."`);
        });
        console.log(`=== END DEBUG ===\n`);

        const context = finalDocs.map(d => {
            const yearLabel = d.metadata?.year ? `[Tahun ${d.metadata.year}] ` : '';
            const pageLabel = d.metadata?.pageNumber ? `(Page ${d.metadata.pageNumber}) ` : '';
            return `source: ${d.metadata?.filename || 'doc'} ${pageLabel}\n${yearLabel}${d.pageContent}`;
        }).join("\n\n---\n\n");
        
        // 2. Memory (Same as before)
        let conversationHistory = "";
        if (sessionId) {
            const sessionMessages = await getSessionMessages(sessionId);
            const recentMessages = sessionMessages.slice(-6);
            conversationHistory = recentMessages
                .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
                .join('\n');
        }
        
        // Wrap memory fetch in try-catch to avoid breaking flow
        let memoryFacts = "";
        try {
            const memories = await getMemories(10);
            memoryFacts = memories.map(m => `- ${m.fact}`).join('\n');
        } catch (memError) {
             console.error("[askQuestionStream] Warning: Failed to fetch memories", memError);
        }
        
        // 3. System Prompt
        // Fetch ALL documents index to let AI know what exists, even if 0 chunks or not retrieved by vector
        let docListText = "";
        try {
            const { getDocuments } = await import("../lib/database");
            const allDocsList = await getDocuments();
            if (allDocsList && allDocsList.length > 0) {
                docListText = "The following is the complete list of files available in the database:\n" + 
                    allDocsList.map((d: any) => `- ${d.filename} (${d.chunks_count} chunks, ${d.pages_count} pages)`).join('\n');
            }
        } catch (e) {
            console.error("Failed to fetch doc list for context:", e);
        }

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

    <|available_documents|>
    ${docListText}
    </|available_documents|>

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
        const sources = finalDocs.map((doc: any) => ({
            page: doc.metadata.pageNumber ?? '?',
            source: doc.metadata.source ?? 'Unknown',
            year: doc.metadata?.year ?? '?'
        }));
        yield JSON.stringify({ type: 'sources', data: sources });

        // 5. Stream LLM Response
        console.log(`Invoking LLM Stream...`);
        let hasContent = false;
  
        const stream = await client.chatCompletionStream({
            model: config.modelRepo,
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
        
    } catch (error: any) {
        console.error("❌ CRITICAL ERROR in askQuestionStream:", error);
         // Generate an error message for the frontend
         yield JSON.stringify({ type: 'content', data: "Terjadi kesalahan internal saat memproses pertanyaan Anda." });
    }
};
