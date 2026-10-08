// scripts/build-config.js
const fs = require('fs');
const path = require('path');

const content = `// Archivo generado automáticamente en build — NO editar a mano
export const MAPBOX_TOKEN = '${process.env.MAPBOX_TOKEN}';
export const SUPABASE_URL = '${process.env.SUPABASE_URL}';
export const SUPABASE_ANON_KEY = '${process.env.SUPABASE_ANON_KEY}';
`;

const outputPath = path.join(__dirname, '..', 'js', 'config.js');
fs.writeFileSync(outputPath, content);

console.log('✅ js/config.js generado con variables de entorno');