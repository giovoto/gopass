const PDFParser = require("pdf2json");
const fs = require("fs");

const file = "d:\\\\1.DESARROLLO\\\\PAGO JG\\\\FEAE12364 PAGOS AUTOMATICOS DE COLOMBIA SAS.pdf";
const pdfParser = new PDFParser(null, 1);

pdfParser.on("pdfParser_dataReady", pdfData => {
    const text = pdfParser.getRawTextContent();
    let descripcion = "";
    let placa = "";
    let total = 0;
    let subtotal = 0;
    let iva = 0;

    const goPassRegex = /(SERVICIO (?:PEAJE|ESTACIONAMIENTO|PARQUEADERO)\\s*[^\\n]+)/i;
    const goPassMatch = text.match(goPassRegex);

    if (goPassMatch) {
        descripcion = goPassMatch[1].trim();
        const placaMatch = text.match(/placa:\\s*([A-Z0-9]+)/i);
        if (placaMatch) placa = placaMatch[1].replace(/[^A-Z0-9]/gi, "").toUpperCase();

        const totalRegex = /(?:VALOR TOTAL|TOTAL A PAGAR|TOTAL)[\\s\\S]{0,100}?\\$\\s*(\\d{1,3}(?:[.,]\\d{3})*(?:[.,]\\d{2})?)(?!\\d)/i;
        const totalMatch = text.match(totalRegex);
        let rawTotal = "";

        if (totalMatch) {
            rawTotal = totalMatch[1];
        } else {
            const moneyRegex = /\\$\\s*(\\d{1,3}(?:[.,]\\d{3})*(?:[.,]\\d{2})?)(?!\\d)/g;
            const matches = [...text.matchAll(moneyRegex)];
            if (matches.length > 0) {
                for (let i = matches.length - 1; i >= 0; i--) {
                    const val = matches[i][1].replace(/[.,]/g, '');
                    if (parseInt(val) > 0) {
                        rawTotal = matches[i][1];
                        break;
                    }
                }
                if (!rawTotal) rawTotal = matches[matches.length - 1][1];
            }
        }

        if (rawTotal) {
            let cleanTotal = rawTotal;
            const hasComma = cleanTotal.includes(',');
            const hasDot = cleanTotal.includes('.');

            if (hasComma && hasDot) {
                if (cleanTotal.lastIndexOf(',') > cleanTotal.lastIndexOf('.')) {
                    cleanTotal = cleanTotal.replace(/\\./g, '').replace(',', '.');
                } else {
                    cleanTotal = cleanTotal.replace(/,/g, '');
                }
            } else if (hasComma) {
                const parts = cleanTotal.split(',');
                if (parts[parts.length - 1].length === 2) {
                    cleanTotal = cleanTotal.replace(',', '.');
                } else {
                    cleanTotal = cleanTotal.replace(',', '');
                }
            } else if (hasDot) {
                const parts = cleanTotal.split('.');
                if (parts[parts.length - 1].length !== 2) {
                    cleanTotal = cleanTotal.replace(/\\./g, '');
                }
            }
            total = Math.round(parseFloat(cleanTotal));
        }

        const allMoneyRegex = /\\$\\s*(\\d{1,3}(?:[.,]\\d{3})*(?:[.,]\\d{2})?)(?!\\d)/g;
        const allMatches = [...text.matchAll(allMoneyRegex)];
        if (allMatches.length > 0 && total > 0) {
            const values = allMatches.map(m => {
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
            } else {
                subtotal = total;
            }
        } else {
            subtotal = total;
        }
        
        console.log(`Extracted => Total: ${total}, Subtotal: ${subtotal}, IVA: ${iva}`);
    } else {
        console.log("No match found for GOPASS regex");
    }
});

pdfParser.loadPDF(file);
