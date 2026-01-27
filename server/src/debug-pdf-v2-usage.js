const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');

const filePath = '/Users/fajarafriansyah/Documents/astro/ai-agent-js/server/uploads/1768819577750-LKIP_SETDA_2024.pdf';
const buffer = fs.readFileSync(filePath);
const uint8Array = new Uint8Array(buffer);

(async () => {
    try {
        console.log('Instantiating PDFParse...');
        const parser = new PDFParse(uint8Array);
        
        console.log('Calling getText()...');
        const result = await parser.getText();
        
        if (Array.isArray(result.pages) && result.pages.length > 0) {
             const page1 = result.pages[0];
             console.log('Page 1 Keys:', Object.keys(page1));
             // Try to print 'text' if it exists
             if (page1.text) {
                 console.log('Page 1 Text Preview:', page1.text.substring(0, 100).replace(/\n/g, ' '));
             }
        }

    } catch (e) {
        console.error('Error in usage:', e);
    }
})();
