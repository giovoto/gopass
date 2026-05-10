const PDFParser = require("pdf2json");
const fs = require("fs");

const file = "d:\\\\1.DESARROLLO\\\\PAGO JG\\\\FEAE12364 PAGOS AUTOMATICOS DE COLOMBIA SAS.pdf";
const pdfParser = new PDFParser(null, 1);

pdfParser.on("pdfParser_dataReady", pdfData => {
    const text = pdfParser.getRawTextContent();
    const moneyRegex = /\\$\\s*(\\d{1,3}(?:[.,]\\d{3})*(?:[.,]\\d{2})?)(?!\\d)/g;
    const matches = [...text.matchAll(moneyRegex)];
    console.log(matches.map(m => m[0]));
});

pdfParser.loadPDF(file);
