const PDFParser = require("pdf2json");
const fs = require("fs");

const file = "d:\\\\1.DESARROLLO\\\\PAGO JG\\\\FEAE12364 PAGOS AUTOMATICOS DE COLOMBIA SAS.pdf";
const pdfParser = new PDFParser(null, 1);

pdfParser.on("pdfParser_dataReady", pdfData => {
    const text = pdfParser.getRawTextContent();
    const goPassRegex = /(SERVICIO (?:PEAJE|ESTACIONAMIENTO)[\\s\\S]{0,100}placa:\\s*[A-Z0-9]+)/i;
    const match = text.match(goPassRegex);
    if(match) {
        console.log("MATCH:", match[0]);
    } else {
        console.log("NO MATCH");
    }
});
pdfParser.loadPDF(file);
