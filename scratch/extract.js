const PDFParser = require("pdf2json");
const fs = require("fs");

const file = "d:\\\\1.DESARROLLO\\\\PAGO JG\\\\FEAE12364 PAGOS AUTOMATICOS DE COLOMBIA SAS.pdf";
const pdfParser = new PDFParser(null, 1);

pdfParser.on("pdfParser_dataError", errData => console.error(errData.parserError));
pdfParser.on("pdfParser_dataReady", pdfData => {
    console.log(pdfParser.getRawTextContent());
});

pdfParser.loadPDF(file);
