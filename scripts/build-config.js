const fs = require('fs');
const path = require('path');

// Obtener variables de entorno
const mapboxToken = process.env.MAPBOX_TOKEN || '';
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

const fileContent = `// Archivo generado automáticamente en build — NO editar a mano
export const MAPBOX_TOKEN = '${mapboxToken}';
export const SUPABASE_URL = '${supabaseUrl}';
export const SUPABASE_ANON_KEY = '${supabaseAnonKey}';
`;

const configPath = path.join(__dirname, '..', 'js', 'config.js');

try {
  // Asegurarse de que el directorio js/ exista
  const dir = path.dirname(configPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(configPath, fileContent, 'utf8');
  console.log('✅ js/config.js generado con variables de entorno');
} catch (error) {
  console.error('❌ Error al generar js/config.js:', error);
  process.exit(1);
}

// Nota: Para desarrollo local con Node < 20.6.0, si el flag --env-file no está disponible,
// puedes requerir 'dotenv' manualmente, pero no está instalado por defecto para 
// mantener el entorno limpio para Vercel.
