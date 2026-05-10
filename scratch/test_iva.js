const PDFParser = require("pdf2json");
const fs = require("fs");

const file = "d:\\\\1.DESARROLLO\\\\PAGO JG\\\\FEAE12364 PAGOS AUTOMATICOS DE COLOMBIA SAS.pdf";
const pdfParser = new PDFParser(null, 1);

pdfParser.on("pdfParser_dataError", errData => console.error(errData.parserError));
pdfParser.on("pdfParser_dataReady", pdfData => {
    const text = pdfParser.getRawTextContent();
    const moneyRegex = /\\$\\s*(\\d{1,3}(?:[.,]\\d{3})*(?:[.,]\\d{2})?)(?!\\d)/g;
    const matches = [...text.matchAll(moneyRegex)];
    const values = matches.map(m => {
        let clean = m[1];
        if (clean.includes(',') && clean.includes('.')) {
            if (clean.lastIndexOf(',') > clean.lastIndexOf('.')) {
                clean = clean.replace(/\\./g, '').replace(',', '.');
            } else {
                clean = clean.replace(/,/g, '');
            }
        } else if (clean.includes(',')) {
            if (clean.split(',').pop().length === 2) clean = clean.replace(',', '.');
            else clean = clean.replace(/,/g, '');
        }
        return Math.round(parseFloat(clean));
    }).filter(v => v > 0);

    const uniqueValues = [...new Set(values)].sort((a, b) => b - a);
    console.log("Unique values found:", uniqueValues);
    
    let total = uniqueValues[0] || 0;
    let subtotal = total;
    let iva = 0;
    
    // Check if any two other values sum to total
    for (let i = 1; i < uniqueValues.length; i++) {
        for (let j = i; j < uniqueValues.length; j++) {
            if (uniqueValues[i] + uniqueValues[j] === total) {
                subtotal = uniqueValues[i] > uniqueValues[j] ? uniqueValues[i] : uniqueValues[j];
                iva = uniqueValues[i] < uniqueValues[j] ? uniqueValues[i] : uniqueValues[j];
                break;
            }
        }
        if (iva > 0) break;
    }
    
    console.log(`Total: ${total}, Subtotal: ${subtotal}, IVA: ${iva}`);
});

pdfParser.loadPDF(file);
