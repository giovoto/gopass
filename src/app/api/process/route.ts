import { NextRequest, NextResponse } from "next/server";
import PDFParser from "pdf2json";

// Mapeos de negocio (Placa -> Centro de costos)
const CENTROS_COSTOS = {
    // 014 AZTECA
    "AZTECA": "014",
    "FLORENCIA AZ": "014 - 10",
    "ADMINISTRACION AZ": "014 - 11",
    "IBAGUE AZ": "014 - 2",
    "SALDAÑA AZ": "014 - 3",
    "FLANDES AZ": "014 - 4",
    "ARMERO AZ": "014 - 5",
    "NEIVA AZ": "014 - 6",
    "GARZON 1 AZ": "014 - 7",
    "GARZON 2 AZ": "014 - 8",
    "MOCOA AZ": "014 - 9",

    // 015 INSPIRINGPGD
    "INSPIRINGPGD": "015",
    "MARIQUITA INS": "015 - 2",
    "FLANDES INS": "015 - 3"
};

// Mapeo directo de Placa -> Centro de costos específico
const PLACA_A_CENTRO: Record<string, string> = {
    // Vehiculos Azteca
    "DTW106": "014 - 10", // FLORENCIA AZ
    "KRS521": "014 - 2",  // IBAGUE AZ
    "GBU033": "014 - 3",  // SALDAÑA AZ
    "ZZN059": "014 - 4",  // FLANDES AZ
    "ZYY099": "014 - 5",  // ARMERO AZ
    "LTP101": "014 - 6",  // NEIVA AZ (OCR variant 1)
    "LPT101": "014 - 6",  // NEIVA AZ (OCR variant 2, user mentioned both)
    "LTP071": "014 - 7",  // GARZON 1 AZ
    "MSN700": "014 - 8",  // GARZON 2 AZ
    "COD289": "014 - 9",  // MOCOA AZ

    // Vehiculos Inspiringpgd (015 - 1)
    "NOK986": "015 - 1",
    "LUX980": "015 - 1",
    "NZL280": "015 - 1",
    "NPY085": "015 - 1",
    "NUX935": "015 - 1",
};

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const files = formData.getAll("files") as File[];
        const fechaElaboracion = formData.get("fecha") as string || "";
        let consecutivo = parseInt(formData.get("consecutivo") as string) || 1;

        const customPlacasStr = formData.get("customPlacas") as string;
        let effectivePlacas: Record<string, string> = { ...PLACA_A_CENTRO };

        if (customPlacasStr) {
            try {
                const parsed = JSON.parse(customPlacasStr);
                for (const key in parsed) {
                    if (parsed[key] && typeof parsed[key] === 'object' && parsed[key].centro) {
                        effectivePlacas[key] = parsed[key].centro;
                    } else if (typeof parsed[key] === 'string') {
                        effectivePlacas[key] = parsed[key];
                    }
                }
            } catch (e) {
                console.error("Failed to parse customPlacas", e);
            }
        }

        if (!files || files.length === 0) {
            return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
        }

        const results = [];
        let grandTotal = 0;
        let lastParams: any = null;

        for (const file of files) {
            if (file.type === "application/pdf") {
                const buffer = await file.arrayBuffer();

                try {
                    const pdfParser = new (PDFParser as any)(null, 1);
                    const text: string = await new Promise((resolve, reject) => {
                        pdfParser.on("pdfParser_dataError", (errData: any) => reject(errData.parserError));
                        pdfParser.on("pdfParser_dataReady", () => resolve(pdfParser.getRawTextContent()));
                        pdfParser.parseBuffer(Buffer.from(buffer));
                    });

                    let prefijo = "";
                    let folio = "";
                    let descripcion = "";
                    let placa = "";
                    let total = 0;

                    // Extraer Prefijo y Folio
                    const docMatch = text.match(/([A-Z]{3,4})-(\d+)/);
                    if (docMatch) {
                        prefijo = docMatch[1];
                        folio = docMatch[2];
                    }

                    // LÓGICA GOPASS (Versión dedicada)
                    const goPassRegex = /(SERVICIO PEAJE\s*[^\n]+)/i;
                    const goPassMatch = text.match(goPassRegex);

                    if (goPassMatch) {
                        descripcion = goPassMatch[1].trim();
                        const placaMatch = text.match(/placa:\s*([A-Z0-9]+)/i);
                        if (placaMatch) placa = placaMatch[1].replace(/[^A-Z0-9]/gi, "").toUpperCase();

                        // Normalización mejorada para GoPass
                        const totalContextMatch = text.match(/VALOR TOTAL\s*\$?\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))/i);
                        let rawTotal = "";
                        if (totalContextMatch) {
                            rawTotal = totalContextMatch[1];
                        } else {
                            const moneyRegex = /(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))/g;
                            const moneyMatches = [...text.matchAll(moneyRegex)];
                            if (moneyMatches.length > 0) rawTotal = moneyMatches[moneyMatches.length - 1][1];
                        }

                        if (rawTotal) {
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
                            total = parseFloat(cleanTotal);
                        }
                    }

                    // Determinar Centro de Costos
                    let centroCostos = effectivePlacas[placa] || "";

                    // Extraer solo la parte del código (números, guiones y espacios iniciales)
                    const prefixMatch = centroCostos.match(/^[\d\s\-]+/);
                    if (prefixMatch) {
                        centroCostos = prefixMatch[0].replace(/\s+/g, "");
                    } else {
                        centroCostos = centroCostos.replace(/\s+/g, "");
                    }

                    // Formatear Descripcion Final
                    if (descripcion) {
                        descripcion = `(${prefijo} ${folio} ${descripcion})`;
                    } else {
                        descripcion = `(${prefijo} ${folio} Placa: ${placa})`;
                    }

                    // Reglas de Contabilidad
                    // Siempre cuenta 739566 (Debito) y 13300501 / 17059501 (Credito)

                    const sharedData = {
                        "Tipo de comprobante": "800",
                        "Consecutivo comprobante": consecutivo,
                        "Fecha de elaboraci\u00f3n ": fechaElaboracion,
                        "Sigla moneda": "COP",
                        "Identificaci\u00f3n tercero": "900219834",
                        "Sucursal": "",
                        "Prefijo": "", // Columna M
                        "Consecutivo": "", // Columna N
                        "No. cuota": "", // Columna O
                        "Fecha vencimiento": "", // Columna P
                        "C\u00f3digo impuesto": "", // Columna Q
                        "C\u00f3digo grupo activo fijo": "", // Columna R
                        "C\u00f3digo activo fijo": "", // Columna S
                        "Descripci\u00f3n": descripcion,
                        "C\u00f3digo centro/subcentro de costos": centroCostos,
                        "_metadata": { fileName: file.name, placa } // for UI feedback
                    };

                    // Fila Débito
                    results.push({
                        ...sharedData,
                        "C\u00f3digo cuenta contable": "739566",
                        "D\u00e9bito": total,
                        "Cr\u00e9dito": 0
                    });

                    lastParams = sharedData;
                    grandTotal += total;

                } catch (err) {
                    console.error(`Error parsing PDF ${file.name}:`, err);
                    results.push({ error: `Failed to parse ${file.name}` });
                }
            }
        }

        // Fila Crédito (Consolidada al final de la tanda)
        if (lastParams && grandTotal > 0) {
            results.push({
                ...lastParams,
                "C\u00f3digo cuenta contable": "17059501",
                "D\u00e9bito": 0,
                "Cr\u00e9dito": grandTotal,
                "Descripci\u00f3n": "TOTAL PAGO PEAJES",
                "C\u00f3digo centro/subcentro de costos": "", // Puede ir vacío o se puede heredar el último iterado
            });
        }

        // Prepare response
        const successfulRecords = results.filter(r => !r.error);
        const errors = results.filter(r => r.error);

        return NextResponse.json({
            success: true,
            records: successfulRecords,
            errors
        });

    } catch (error) {
        console.error("API Error:", error);
        return NextResponse.json({ error: "Server processing error" }, { status: 500 });
    }
}
