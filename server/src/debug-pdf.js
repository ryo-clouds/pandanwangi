const pdf = require('pdf-parse');
console.log('Type of pdf:', typeof pdf);
console.log('pdf export:', pdf);
try {
    console.log('Is valid function?', typeof pdf === 'function');
} catch (e) {
    console.error(e);
}
