const PDFParser = require("pdf2json");
const fs = require("fs");

const file = "d:\\\\1.DESARROLLO\\\\PAGO JG\\\\FEAE12364 PAGOS AUTOMATICOS DE COLOMBIA SAS.pdf";
const pdfParser = new PDFParser(null, 1);

pdfParser.on("pdfParser_dataReady", pdfData => {
    const text = pdfParser.getRawTextContent();
    
    const goPassRegex = /(SERVICIO (?:PEAJE|ESTACIONAMIENTO)\\s*[^\\n]+)/i;
    const goPassMatch = text.match(goPassRegex);
    let descripcion = "";
    let placa = "";
    let total = 0;
    
    if (goPassMatch) {
        descripcion = goPassMatch[1].trim();
        const placaMatch = text.match(/placa:\\s*([A-Z0-9]+)/i);
        if (placaMatch) placa = placaMatch[1].replace(/[^A-Z0-9]/gi, "").toUpperCase();
        
        const moneyRegex = /\\$\\s*(\\d{1,3}(?:[.,]\\d{3})*(?:[.,]\\d{2})?)(?!\\d)/g;
        const matches = [...text.matchAll(moneyRegex)];
        
        let rawTotal = "";
        if (matches.length > 0) {
            for (let i = matches.length - 1; i >= 0; i--) {
                const val = matches[i][1].replace(/[.,]/g, '');
                if (parseInt(val) > 0) {
                    rawTotal = matches[i][1];
                    break;
                }
            }
        }
        
        if (rawTotal) {
            let cleanTotal = rawTotal;
            if (cleanTotal.includes(',') && cleanTotal.includes('.')) {
                if (cleanTotal.lastIndexOf(',') > cleanTotal.lastIndexOf('.')) {
                    cleanTotal = cleanTotal.replace(/\\./g, '').replace(',', '.');
                } else {
                    cleanTotal = cleanTotal.replace(/,/g, '');
                }
            } else if (cleanTotal.includes(',')) {
                if (cleanTotal.split(',').pop().length === 2) cleanTotal = cleanTotal.replace(',', '.');
                else cleanTotal = cleanTotal.replace(/,/g, '');
            } else if (cleanTotal.includes('.')) {
                if (cleanTotal.split('.').pop().length !== 2) cleanTotal = cleanTotal.replace(/\\./g, '');
            }
            total = Math.round(parseFloat(cleanTotal));
        }

        let subtotal = total;
        let iva = 0;

        if (matches.length > 0 && total > 0) {
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
                } else if (clean.includes('.')) {
                    if (clean.split('.').pop().length !== 2) clean = clean.replace(/\\./g, '');
                }
                return Math.round(parseFloat(clean));
            }).filter(v => v > 0);

            const uniqueValues = [...new Set(values)].sort((a, b) => b - a);
            let foundTotal = uniqueValues[0] || 0;
            let tempSubtotal = foundTotal;
            let tempIva = 0;
            for (let i = 1; i < uniqueValues.length; i++) {
                for (let j = i; j < uniqueValues.length; j++) {
                    if (uniqueValues[i] + uniqueValues[j] === foundTotal) {
                        tempSubtotal = uniqueValues[i] > uniqueValues[j] ? uniqueValues[i] : uniqueValues[j];
                        tempIva = uniqueValues[i] < uniqueValues[j] ? uniqueValues[i] : uniqueValues[j];
                        break;
                    }
                }
                if (tempIva > 0) break;
            }
            if (tempIva > 0 && foundTotal === total) {
                subtotal = tempSubtotal;
                iva = tempIva;
            }
        }
        console.log({ descripcion, placa, total, subtotal, iva });
    }
});

pdfParser.loadPDF(file);
