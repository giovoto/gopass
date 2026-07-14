/**
 * Script para procesamiento masivo de facturas GoPass para SIIGO.
 * Ejecución: node process_batch.js
 * Requisitos: npm install pdf2json xlsx
 */

const fs = require('fs');
const path = require('path');
const PDFParser = require('pdf2json');
const XLSX = require('xlsx');

// --- CONFIGURACIÓN ---
const CONFIG = {
    fechaElaboracion: "05/05/2026", // Ajustar según sea necesario
    consecutivoInicial: 1,
    identificacionTercero: "901294241",
    cuentaDebito: "739566",
    cuentaCredito: "17059501",
    // Mapeo de Placas a Centros de Costos
    placas: {
        // "ABC123": "001",
    }
};

const SIIGO_COLUMNS = [
    "Tipo de comprobante", "Consecutivo comprobante", "Fecha de elaboraci\u00f3n ",
    "Sigla moneda", "Tasa de cambio", "C\u00f3digo cuenta contable",
    "Identificaci\u00f3n tercero", "Sucursal", "C\u00f3digo producto",
    "C\u00f3digo de bodega", "Acci\u00f3n", "Cantidad producto", "Prefijo",
    "Consecutivo", "No. cuota", "Fecha vencimiento", "C\u00f3digo impuesto",
    "C\u00f3digo grupo activo fijo", "C\u00f3digo activo fijo", "Descripci\u00f3n",
    "C\u00f3digo centro/subcentro de costos", "D\u00e9bito", "Cr\u00e9dito",
    "Observaciones", "Base gravable libro compras/ventas  ",
    "Base exenta libro compras/ventas", "Mes de cierre"
];

async function parsePDF(filePath) {
    return new Promise((resolve, reject) => {
        const pdfParser = new PDFParser(null, 1);
        pdfParser.on("pdfParser_dataError", errData => reject(errData.parserError));
        pdfParser.on("pdfParser_dataReady", () => resolve(pdfParser.getRawTextContent()));
        pdfParser.loadPDF(filePath);
    });
}

function parseCurrency(rawTotal) {
    if (!rawTotal) return 0;
    
    let cleanTotal = rawTotal;
    const hasComma = cleanTotal.includes(',');
    const hasDot = cleanTotal.includes('.');

    if (hasComma && hasDot) {
        if (cleanTotal.lastIndexOf(',') > cleanTotal.lastIndexOf('.')) {
            cleanTotal = cleanTotal.replace(/\./g, '').replace(',', '.');
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
            cleanTotal = cleanTotal.replace(/\./g, '');
        }
    }
    return parseFloat(cleanTotal);
}

async function run() {
    const files = fs.readdirSync(__dirname).filter(f => f.toLowerCase().endsWith('.pdf'));
    console.log(`Detectados ${files.length} archivos PDF.`);

    const records = [];
    let grandTotal = 0;
    let currentConsecutivo = CONFIG.consecutivoInicial;

    for (const fileName of files) {
        try {
            console.log(`Procesando: ${fileName}...`);
            const text = await parsePDF(path.join(__dirname, fileName));

            let prefijo = "", folio = "", placa = "", total = 0, descripcion = "";

            const docMatch = text.match(/([A-Z]{3,4})\s*-\s*(\d+)/);
            if (docMatch) { prefijo = docMatch[1]; folio = docMatch[2]; }

            const singleLineText = text.replace(/[\r\n]+/g, ' ');

            const goPassRegex = /(SERVICIO (?:PEAJE|ESTACIONAMIENTO|PARQUEADERO).*?)(?=\s+WSD|\s+CATEGORIA|$)/i;
            const goPassMatch = singleLineText.match(goPassRegex);
            
            if (goPassMatch) {
                descripcion = goPassMatch[1].trim();
            }
            
            const placaMatch = singleLineText.match(/pla\s*ca\s*:\s*([A-Z0-9]+)/i) || singleLineText.match(/placa:\s*([A-Z0-9]+)/i);
            if (placaMatch) placa = placaMatch[1].replace(/[^A-Z0-9]/gi, "").toUpperCase();

            // Extracción de total mejorada (con (?!\d) para evitar capturar dígitos adicionales)
            const totalRegex = /(?:VALOR TOTAL|TOTAL A PAGAR|TOTAL FACTURA(?:\s*\(\=\))?|TOTAL)[\s\S]{0,100}?(?:COP\s*)?\$\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)(?!\d)/i;
            const totalMatch = text.match(totalRegex) || singleLineText.match(totalRegex);
            let rawTotal = "";

            if (totalMatch) {
                rawTotal = totalMatch[1];
            } else {
                const moneyRegex = /\$\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)(?!\d)/g;
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
                total = Math.round(parseCurrency(rawTotal));
            }

            const centroCostos = CONFIG.placas[placa] || "";
            const finalDesc = descripcion ? `(${prefijo} ${folio} ${descripcion})` : `(${prefijo} ${folio} Placa: ${placa})`;

            // Fila Débito
            records.push({
                "Tipo de comprobante": "800",
                "Consecutivo comprobante": currentConsecutivo,
                "Fecha de elaboraci\u00f3n ": CONFIG.fechaElaboracion,
                "Sigla moneda": "COP",
                "Identificaci\u00f3n tercero": CONFIG.identificacionTercero,
                "C\u00f3digo cuenta contable": CONFIG.cuentaDebito,
                "Descripci\u00f3n": finalDesc,
                "C\u00f3digo centro/subcentro de costos": centroCostos,
                "D\u00e9bito": total,
                "Cr\u00e9dito": 0
            });

            grandTotal += total;

        } catch (err) {
            console.error(`Error en ${fileName}:`, err.message);
        }
    }

    if (records.length > 0) {
        // Fila Crédito Consolidada
        records.push({
            "Tipo de comprobante": "800",
            "Consecutivo comprobante": currentConsecutivo,
            "Fecha de elaboraci\u00f3n ": CONFIG.fechaElaboracion,
            "Sigla moneda": "COP",
            "Identificaci\u00f3n tercero": CONFIG.identificacionTercero,
            "C\u00f3digo cuenta contable": CONFIG.cuentaCredito,
            "Descripci\u00f3n": "TOTAL PAGO PEAJES GOPASS",
            "C\u00f3digo centro/subcentro de costos": "",
            "D\u00e9bito": 0,
            "Cr\u00e9dito": grandTotal
        });

        // Generar Excel
        const formattedData = records.map(record => {
            let row = {};
            SIIGO_COLUMNS.forEach(col => row[col] = record[col] !== undefined ? record[col] : "");
            return row;
        });

        const worksheet = XLSX.utils.json_to_sheet(formattedData, { header: SIIGO_COLUMNS });
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Comprobantes");

        const outPath = path.join(__dirname, `IMPORTACION_SIIGO_BATCH_${Date.now()}.xlsx`);
        XLSX.writeFile(workbook, outPath);
        console.log(`\n¡Éxito! Archivo generado en: ${outPath}`);
    }
}

run();
