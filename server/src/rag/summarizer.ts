import { InferenceClient } from "@huggingface/inference";
import { config } from "../config";
import { supabase } from "../lib/supabase";

const client = new InferenceClient(config.hfToken);

// ============ DOCUMENT SUMMARY GENERATION (Layer 1 of CAG) ============

export const generateDocumentSummary = async (
    documentId: string,
    documentText: string,
    filename: string
): Promise<{ summary: string; keyTopics: string[] }> => {
    console.log(`🧠 [CAG] Generating summary for: ${filename}`);

    try {
        // Truncate text to avoid token limits (use first ~6000 chars)
        const truncatedText = documentText.substring(0, 6000);

        const response = await client.chatCompletion({
            model: config.modelRepo,
            messages: [
                {
                    role: "system",
                    content: `You are a document analyzer for Indonesian government documents. 
Your task is to create a concise summary and extract key topics.

RESPOND IN THIS EXACT JSON FORMAT ONLY:
{"summary": "2-3 sentence summary in Indonesian", "keyTopics": ["topic1", "topic2", "topic3"]}`
                },
                {
                    role: "user",
                    content: `Analyze this document (${filename}):\n\n${truncatedText}`
                }
            ],
            temperature: 0.3,
            max_tokens: 500
        });

        const content = response.choices[0]?.message?.content || '';
        
        // Parse JSON response
        try {
            // Extract JSON from response (handle markdown code blocks)
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                const summary = parsed.summary || `Dokumen ${filename}`;
                const keyTopics = Array.isArray(parsed.keyTopics) ? parsed.keyTopics : [];

                // Save to Supabase
                await saveDocumentSummary(documentId, summary, keyTopics);
                
                console.log(`✅ [CAG] Summary generated for ${filename}: "${summary.substring(0, 80)}..."`);
                return { summary, keyTopics };
            }
        } catch (parseError) {
            console.warn(`[CAG] Failed to parse LLM summary JSON, using raw text`);
        }

        // Fallback: use raw content as summary
        const fallbackSummary = content.substring(0, 300) || `Dokumen: ${filename}`;
        await saveDocumentSummary(documentId, fallbackSummary, []);
        return { summary: fallbackSummary, keyTopics: [] };

    } catch (error: any) {
        console.error(`❌ [CAG] Summary generation failed for ${filename}:`, error.message);
        // Save minimal summary so we don't retry endlessly
        const minimalSummary = `Dokumen ${filename} (summary pending)`;
        await saveDocumentSummary(documentId, minimalSummary, []);
        return { summary: minimalSummary, keyTopics: [] };
    }
};

// ============ DATABASE OPERATIONS ============

const saveDocumentSummary = async (
    documentId: string,
    summary: string,
    keyTopics: string[]
): Promise<void> => {
    try {
        // Upsert - update if exists, insert if not
        const { data: existing } = await supabase
            .from('document_summaries')
            .select('id')
            .eq('document_id', documentId)
            .single();

        if (existing) {
            await supabase
                .from('document_summaries')
                .update({ summary, key_topics: keyTopics, updated_at: new Date().toISOString() })
                .eq('document_id', documentId);
        } else {
            await supabase
                .from('document_summaries')
                .insert({ document_id: documentId, summary, key_topics: keyTopics });
        }
    } catch (e: any) {
        console.warn('[CAG] Failed to save document summary:', e.message);
    }
};

export const getDocumentSummary = async (documentId: string): Promise<string | null> => {
    try {
        const { data } = await supabase
            .from('document_summaries')
            .select('summary')
            .eq('document_id', documentId)
            .single();
        return data?.summary || null;
    } catch {
        return null;
    }
};

export const getAllDocumentSummaries = async (): Promise<
    Array<{ document_id: string; summary: string; key_topics: string[] }>
> => {
    try {
        const { data, error } = await supabase
            .from('document_summaries')
            .select('document_id, summary, key_topics')
            .order('created_at', { ascending: true });

        if (error || !data) return [];
        return data;
    } catch {
        return [];
    }
};

export const deleteDocumentSummary = async (documentId: string): Promise<void> => {
    try {
        await supabase
            .from('document_summaries')
            .delete()
            .eq('document_id', documentId);
        console.log(`🗑️ [CAG] Summary deleted for document: ${documentId}`);
    } catch (e: any) {
        console.warn('[CAG] Failed to delete summary:', e.message);
    }
};
