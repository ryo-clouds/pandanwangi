
const PDFParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');

const testPdf = async () => {
    try {
        console.log('Testing PDF Parse...');
        // Create a dummy PDF buffer (or try to read one if possible, but dummy is safer to avoid path issues)
        // Actually, a 0-byte buffer might fail. Let's try to assume the import is the issue first.
        console.log('PDFParse type:', typeof PDFParse);
        console.log('PDFParse value:', PDFParse);
        
        // If it's a function, it's good.
        if (typeof PDFParse !== 'function') {
            console.error('PDFParse is NOT a function!');
        } else {
            console.log('PDFParse IS a function, proceeding...');
        }
    } catch (e) {
        console.error('Error:', e);
    }
};

testPdf();
