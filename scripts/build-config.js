const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');

// 1. Obtener variables de entorno (con fallback a js/config.js existente para desarrollo local)
let mapboxToken = process.env.MAPBOX_TOKEN || '';
let supabaseUrl = process.env.SUPABASE_URL || '';
let supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

const localConfigPath = path.join(rootDir, 'js', 'config.js');

if ((!mapboxToken || !supabaseUrl || !supabaseAnonKey) && fs.existsSync(localConfigPath)) {
  try {
    const existingContent = fs.readFileSync(localConfigPath, 'utf8');
    const tokenMatch = existingContent.match(/MAPBOX_TOKEN\s*=\s*['"`](.*?)['"`]/);
    const urlMatch = existingContent.match(/SUPABASE_URL\s*=\s*['"`](.*?)['"`]/);
    const keyMatch = existingContent.match(/SUPABASE_ANON_KEY\s*=\s*['"`](.*?)['"`]/);

    if (!mapboxToken && tokenMatch && tokenMatch[1]) mapboxToken = tokenMatch[1];
    if (!supabaseUrl && urlMatch && urlMatch[1]) supabaseUrl = urlMatch[1];
    if (!supabaseAnonKey && keyMatch && keyMatch[1]) supabaseAnonKey = keyMatch[1];
  } catch (err) {
    console.warn('⚠️ No se pudo leer el archivo local js/config.js existente:', err.message);
  }
}

console.log('--- VERIFICANDO VARIABLES DE ENTORNO ---');
console.log(`MAPBOX_TOKEN: ${mapboxToken ? '✅ Presente (' + mapboxToken.length + ' chars)' : '❌ VACÍO'}`);
console.log(`SUPABASE_URL: ${supabaseUrl ? '✅ Presente' : '❌ VACÍO'}`);
console.log(`SUPABASE_ANON_KEY: ${supabaseAnonKey ? '✅ Presente (' + supabaseAnonKey.length + ' chars)' : '❌ VACÍO'}`);
console.log('----------------------------------------');

const fileContent = `// Archivo generado automáticamente en build — NO editar a mano
export const MAPBOX_TOKEN = '${mapboxToken}';
export const SUPABASE_URL = '${supabaseUrl}';
export const SUPABASE_ANON_KEY = '${supabaseAnonKey}';
`;

try {
  // 2. Asegurarse de que js/config.js local exista
  const jsDir = path.join(rootDir, 'js');
  if (!fs.existsSync(jsDir)) {
    fs.mkdirSync(jsDir, { recursive: true });
  }

  if (mapboxToken || supabaseUrl || supabaseAnonKey || !fs.existsSync(localConfigPath)) {
    fs.writeFileSync(localConfigPath, fileContent, 'utf8');
    console.log('✅ js/config.js generado con variables de entorno (Local)');
  } else {
    console.log('ℹ️ js/config.js existente mantenido');
  }

  // 3. Limpiar y recrear el directorio de distribución (dist) para eliminar archivos obsoletos
  const distDir = path.join(rootDir, 'dist');
  if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
  }
  fs.mkdirSync(distDir, { recursive: true });
  console.log('🧹 Directorio dist limpiado para nueva estructura');

  // 4. Copiar archivos y carpetas estáticas al directorio dist según la nueva distribución MVC
  const htmlFiles = fs.readdirSync(rootDir).filter(file => file.endsWith('.html'));
  const itemsToCopy = ['css', 'img', 'js', ...htmlFiles];
  const uniqueItems = [...new Set(itemsToCopy)];

  uniqueItems.forEach(item => {
    const srcPath = path.join(rootDir, item);
    const destPath = path.join(distDir, item);
    if (fs.existsSync(srcPath)) {
      fs.cpSync(srcPath, destPath, { recursive: true });
    }
  });
  console.log(`📦 Archivos y carpetas copiados a dist (${uniqueItems.join(', ')})`);

  // 5. Escribir archivo de configuración en dist/js/config.js
  const distConfigPath = path.join(distDir, 'js', 'config.js');
  fs.writeFileSync(distConfigPath, fileContent, 'utf8');
  console.log('✅ dist/js/config.js generado para Producción en Vercel');

  // 6. Generar también dist/js/models/config.js para compatibilidad hacia atrás
  const distModelsDir = path.join(distDir, 'js', 'models');
  if (fs.existsSync(distModelsDir)) {
    const distModelsConfigPath = path.join(distModelsDir, 'config.js');
    fs.writeFileSync(distModelsConfigPath, fileContent, 'utf8');
    console.log('✅ dist/js/models/config.js generado para compatibilidad');
  }

  console.log('🎉 Carpeta dist construida exitosamente con la nueva distribución!');

} catch (error) {
  console.error('❌ Error al generar archivos de configuración:', error);
  process.exit(1);
}
