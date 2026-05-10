const XLSX = require('xlsx');
const workbook = XLSX.readFile('IMPORTACION_SIIGO_BATCH_1777991454249.xlsx');
const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
const headers = XLSX.utils.sheet_to_json(firstSheet, { header: 1 })[0];
console.log(JSON.stringify(headers));
