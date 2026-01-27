"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processPdf = void 0;
const textsplitters_1 = require("@langchain/textsplitters");
const vector_1 = require("./vector");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const documents_1 = require("@langchain/core/documents");
const { PDFParse } = require('pdf-parse');
// Extract year from filename
const extractYearFromFilename = (filename) => {
    const yearMatch = filename.match(/20\d{2}/);
    return yearMatch ? yearMatch[0] : null;
};
// Extract document type
const extractDocTypeFromFilename = (filename) => {
    const upperFilename = filename.toUpperCase();
    if (upperFilename.includes('LKIP'))
        return 'LKIP';
    if (upperFilename.includes('RPJMD'))
        return 'RPJMD';
    if (upperFilename.includes('RENSTRA'))
        return 'RENSTRA';
    if (upperFilename.includes('RENJA'))
        return 'RENJA';
    if (upperFilename.includes('LAKIP'))
        return 'LAKIP';
    return 'DOKUMEN';
};
// Helper to clean text
const cleanPageText = (text) => {
    return text
        .replace(/\n\s*\n/g, "\n\n")
        .replace(/([^\n])\n([^\n])/g, "$1 $2");
};
const processPdf = async (input, sourceUrl, originalFilename) => {
    try {
        let dataBuffer;
        let filename;
        if (Buffer.isBuffer(input)) {
            dataBuffer = input;
            filename = originalFilename || 'unknown_file.pdf';
            console.log(`Processing PDF Buffer: ${filename}`);
        }
        else {
            console.log(`Processing PDF File: ${input}`);
            dataBuffer = fs_1.default.readFileSync(input);
            filename = path_1.default.basename(input);
        }
        const year = extractYearFromFilename(filename);
        const docType = extractDocTypeFromFilename(filename);
        console.log(`Detected: Year=${year}, DocType=${docType}`);
        // Usage for "mehmet-kozan/pdf-parse" v2.4.5:
        // Requires Uint8Array and returns struct with .pages array locally
        const parser = new PDFParse(new Uint8Array(dataBuffer));
        const result = await parser.getText();
        const rawPages = result.pages; // Array<{ text: string, num: number }>
        if (!rawPages || !Array.isArray(rawPages)) {
            throw new Error("Failed to extract pages: result.pages is not an array");
        }
        console.log(`Extracted ${rawPages.length} pages.`);
        const docSource = sourceUrl; // Force use of sourceUrl (Supabase Link)
        const pageDocs = [];
        rawPages.forEach((pageData, index) => {
            const pageNum = index + 1;
            const textContent = pageData.text || "";
            const cleanedText = cleanPageText(textContent);
            pageDocs.push(new documents_1.Document({
                pageContent: cleanedText,
                metadata: {
                    source: docSource,
                    year: year,
                    docType: docType,
                    filename: filename,
                    totalPages: rawPages.length,
                    pageNumber: pageNum, // Explicit Page Number
                    loc: { pageNumber: pageNum } // Compatibility
                }
            }));
        });
        const splitter = new textsplitters_1.RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200,
        });
        // Split each page individually to preserve page metadata validity
        const chunks = await splitter.splitDocuments(pageDocs);
        // Ensure metadata persistence
        chunks.forEach(chunk => {
            chunk.metadata.source = docSource;
            chunk.metadata.year = year;
        });
        console.log(`Split into ${chunks.length} chunks. Indexing...`);
        await (0, vector_1.addDocuments)(chunks);
        console.log("Indexing complete.");
        return {
            success: true,
            chunks: chunks.length,
            pages: rawPages.length,
            year: year,
            docType: docType
        };
    }
    catch (error) {
        console.error("PDF Processing Error:", error);
        throw error;
    }
};
exports.processPdf = processPdf;
