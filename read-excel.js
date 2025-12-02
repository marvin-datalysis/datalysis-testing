const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, 'tests', 'Pruebas Dashboard Clientes.xlsx');
const workbook = XLSX.readFile(filePath);

// Obtener todos los nombres de hojas
const sheetNames = workbook.SheetNames;
console.log('Hojas encontradas:', sheetNames);

// Leer todas las hojas
sheetNames.forEach(sheetName => {
  console.log('\n=== HOJA:', sheetName, '===');
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet);
  console.log(JSON.stringify(data, null, 2));
});

