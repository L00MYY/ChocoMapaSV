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
  // Asegurarse de que el directorio js/ exista localmente
  const dir = path.dirname(configPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // 1. Escribir archivo local para desarrollo
  fs.writeFileSync(configPath, fileContent, 'utf8');
  console.log('✅ js/config.js generado con variables de entorno (Local)');

  // 2. Crear directorio de distribución (dist) para Vercel
  const distDir = path.join(__dirname, '..', 'dist');
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  // 3. Copiar archivos estáticos al directorio dist
  const itemsToCopy = ['css', 'img', 'js', 'index.html', 'mapa.html'];
  const rootDir = path.join(__dirname, '..');
  
  itemsToCopy.forEach(item => {
    const srcPath = path.join(rootDir, item);
    const destPath = path.join(distDir, item);
    if (fs.existsSync(srcPath)) {
      // Usar cpSync que está disponible en Node >= 16.7.0
      fs.cpSync(srcPath, destPath, { recursive: true });
    }
  });

  // 4. Escribir archivo en el directorio dist/js
  const distConfigPath = path.join(distDir, 'js', 'config.js');
  fs.writeFileSync(distConfigPath, fileContent, 'utf8');
  console.log('✅ dist/js/config.js generado para Producción en Vercel');

} catch (error) {
  console.error('❌ Error al generar archivos de configuración:', error);
  process.exit(1);
}

// Nota: Para desarrollo local con Node < 20.6.0, si el flag --env-file no está disponible,
// puedes requerir 'dotenv' manualmente, pero no está instalado por defecto para 
// mantener el entorno limpio para Vercel.
