import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { addDocuments } from "./vector";
import fs from 'fs';
import path from 'path';
import { Document } from "@langchain/core/documents";
import { config } from "../config";

// Extract year from filename
const extractYearFromFilename = (filename: string): string | null => {
    const yearMatch = filename.match(/20\d{2}/);
    return yearMatch ? yearMatch[0] : null;
};

// Extract document type
const extractDocTypeFromFilename = (filename: string): string => {
    const upperFilename = filename.toUpperCase();
    if (upperFilename.includes('LKIP')) return 'LKIP';
    if (upperFilename.includes('RPJMD')) return 'RPJMD';
    if (upperFilename.includes('RENSTRA')) return 'RENSTRA';
    if (upperFilename.includes('RENJA')) return 'RENJA';
    if (upperFilename.includes('LAKIP')) return 'LAKIP';
    return 'DOKUMEN';
};

// Helper to clean text
const cleanPageText = (text: string) => {
    return text
        .replace(/\n\s*\n/g, "\n\n")
        .replace(/([^\n])\n([^\n])/g, "$1 $2");
};

// Google Cloud Vision OCR API
const performCloudOCR = async (pdfBuffer: Buffer, filename: string): Promise<string> => {
    if (!config.googleVisionApiKey) {
        console.warn("Google Vision API key not configured. Skipping OCR.");
        return '';
    }

    console.log(`☁️ Cloud OCR: Processing ${filename} with Google Vision API...`);
    
    const base64Pdf = pdfBuffer.toString('base64');
    
    const requestBody = {
        requests: [{
            inputConfig: {
                content: base64Pdf,
                mimeType: "application/pdf"
            },
            features: [{
                type: "DOCUMENT_TEXT_DETECTION"
            }],
            outputConfig: {
                // We want inline response, not GCS output
            }
        }]
    };

    try {
        const response = await fetch(
            `https://vision.googleapis.com/v1/files:asyncBatchAnnotate?key=${config.googleVisionApiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            }
        );

        if (!response.ok) {
            // Try simpler single-image approach for each page concept
            // Actually, for PDFs we need a different approach
            // Let's use the synchronous annotate endpoint with images
            console.log("Async batch failed, trying synchronous approach...");
            return await performSimpleOCR(pdfBuffer, filename);
        }

        const data = await response.json();
        console.log("Vision API Response:", JSON.stringify(data).substring(0, 200));
        
        // This is async, we'd need to poll... let's use simpler approach
        return await performSimpleOCR(pdfBuffer, filename);
        
    } catch (error: any) {
        console.error("Google Vision API error:", error.message || error);
        return '';
    }
};

// Simpler OCR approach - use document text detection directly
const performSimpleOCR = async (pdfBuffer: Buffer, filename: string): Promise<string> => {
    // For PDFs, Vision API requires GCS or we can convert to images
    // Simplest approach: Use text detection on the PDF directly via annotate
    
    const base64Content = pdfBuffer.toString('base64');
    
    const requestBody = {
        requests: [{
            inputConfig: {
                content: base64Content,
                mimeType: "application/pdf"
            },
            features: [{
                type: "DOCUMENT_TEXT_DETECTION",
                maxResults: 50
            }],
            pages: [1, 2, 3, 4, 5] // Vision API limit: max 5 pages per request
        }]
    };

    try {
        const response = await fetch(
            `https://vision.googleapis.com/v1/files:annotate?key=${config.googleVisionApiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Vision API Error:", errorText);
            throw new Error(`Vision API returned ${response.status}`);
        }

        const data = await response.json();
        
        // Extract text from all pages
        let allText = '';
        if (data.responses) {
            for (const resp of data.responses) {
                if (resp.responses) {
                    for (const pageResp of resp.responses) {
                        if (pageResp.fullTextAnnotation?.text) {
                            allText += pageResp.fullTextAnnotation.text + '\n';
                        }
                    }
                }
            }
        }
        
        console.log(`☁️ Cloud OCR extracted ${allText.length} characters.`);
        return allText;
        
    } catch (error: any) {
        console.error("Simple OCR failed:", error.message || error);
        return '';
    }
};

// Main PDF Processing Function
export const processPdf = async (input: string | Buffer, sourceUrl: string, originalFilename?: string, forceOCR: boolean = false) => {
    try {
        let dataBuffer: Buffer;
        let filename: string;

        if (Buffer.isBuffer(input)) {
            dataBuffer = input;
            filename = originalFilename || 'unknown_file.pdf';
            console.log(`📄 Processing PDF Buffer: ${filename}`);
            console.log(`🔧 Loader Version: CLOUD_OCR_ENABLED`);
        } else {
            console.log(`Processing PDF File: ${input}`);
            dataBuffer = fs.readFileSync(input);
            filename = path.basename(input);
        }

        const year = extractYearFromFilename(filename);
        const docType = extractDocTypeFromFilename(filename);
        console.log(`Detected: Year=${year}, DocType=${docType}`);
        
        // Use pdf-parse-new for text extraction
        const PDFParse = require('pdf-parse-new');
        let rawText = '';
        let totalPages = 1;
        
        try {
            const result = await PDFParse(dataBuffer);
            rawText = result.text || '';
            totalPages = result.numpages || 1;
            console.log(`Standard extraction: ${rawText.length} chars from ${totalPages} pages.`);
        } catch (parseError) {
            console.error("PDF parse failed:", parseError);
        }
        
        // Check if text yield is too low (scanned PDF indicator)
        const MIN_CHARS_PER_PAGE = 100;
        const isLikelyScanned = !rawText || rawText.trim().length < (totalPages * MIN_CHARS_PER_PAGE);
        
        // Run OCR if: 1) likely scanned PDF, OR 2) forceOCR is requested
        const shouldRunOCR = (isLikelyScanned || forceOCR) && config.googleVisionApiKey;
        
        if (shouldRunOCR) {
            console.log(`${forceOCR ? '🔄 Force OCR requested' : '⚠️ Low text yield'} (${rawText.length} chars). Trying Cloud OCR...`);
            console.log(`🔑 API Key present: ${config.googleVisionApiKey ? 'YES (' + config.googleVisionApiKey.substring(0, 10) + '...)' : 'NO'}`);
            
            try {
                const ocrText = await performCloudOCR(dataBuffer, filename);
                if (ocrText && ocrText.length > 0) {
                    // For forceOCR, always use OCR result. Otherwise only if better.
                    if (forceOCR || ocrText.length > rawText.length) {
                        rawText = ocrText;
                        console.log(`✅ Cloud OCR successful: ${rawText.length} chars extracted.`);
                    }
                }
            } catch (ocrError: any) {
                console.error("Cloud OCR failed:", ocrError.message || ocrError);
            }
        } else if (isLikelyScanned && !config.googleVisionApiKey) {
            console.warn(`⚠️ SCANNED PDF: ${filename} - No API key configured for OCR.`);
        }
        
        // If still no text, return with 0 chunks
        if (!rawText || rawText.trim().length === 0) {
            console.error(`❌ NO TEXT: ${filename} - File is image-only.`);
            return {
                success: false,
                chunks: 0,
                pages: totalPages,
                year: year,
                docType: docType,
                isScanned: true,
                message: "Tidak dapat mengekstrak teks dari dokumen ini."
            };
        }

        const docSource = sourceUrl; 
        
        // Create document with extracted text
        const fullDoc = new Document({
            pageContent: cleanPageText(rawText),
            metadata: {
                source: docSource,
                year: year,
                docType: docType,
                filename: filename,
                totalPages: totalPages,
                isScanned: isLikelyScanned
            }
        });

        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200, 
        });

        const chunks = await splitter.splitDocuments([fullDoc]);

        chunks.forEach((chunk, index) => {
             chunk.metadata.source = docSource;
             chunk.metadata.year = year;
             chunk.metadata.chunkIndex = index;
        });
        
        console.log(`✅ Split into ${chunks.length} chunks. Indexing...`);
        await addDocuments(chunks);
        
        console.log("✅ Indexing complete.");
        return {
            success: true,
            chunks: chunks.length,
            pages: totalPages,
            year: year,
            docType: docType,
            isScanned: isLikelyScanned
        };

    } catch (error) {
        console.error("PDF Processing Error:", error);
        throw error;
    }
};
