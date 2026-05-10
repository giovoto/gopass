const PDFParser = require("pdf2json");
const pdfParser = new PDFParser(null, 1);

pdfParser.on("pdfParser_dataError", errData => console.error(errData.parserError));
pdfParser.on("pdfParser_dataReady", pdfData => {
    console.log("--- TEXT CONTENT ---");
    console.log(pdfParser.getRawTextContent());
});

pdfParser.loadPDF("FVFI1008574 PAGOS AUTOMATICOS DE COLOMBIA SAS.pdf");
