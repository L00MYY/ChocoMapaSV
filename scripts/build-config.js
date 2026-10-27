
const fs = require('fs');
const path = require('path');

// ==================================================
// CONFIGURACIÓN DEL PROYECTO
// ==================================================

const rootDir = path.join(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

// Variables de entorno configuradas en Vercel
const mapboxToken = process.env.MAPBOX_TOKEN || '';
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey =
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    '';
// ==================================================
// 1. VALIDAR VARIABLES DE ENTORNO
// ==================================================

const missingVariables = [];

if (!mapboxToken) {
    missingVariables.push('MAPBOX_TOKEN');
}

if (!supabaseUrl) {
    missingVariables.push('SUPABASE_URL');
}

if (!supabaseAnonKey) {
    missingVariables.push('SUPABASE_ANON_KEY');
}

if (missingVariables.length > 0) {
    console.error(
        'ERROR: Faltan variables de entorno:',
        missingVariables.join(', ')
    );

    console.error(
        'Configúralas en Vercel y vuelve a ejecutar el despliegue.'
    );

    process.exit(1);
}

// No imprimir los valores de las claves en los logs
console.log('Variables de entorno verificadas correctamente.');

// ==================================================
// 2. PREPARAR ARCHIVO DE CONFIGURACIÓN PÚBLICA
// ==================================================

// Estas variables son accesibles desde el navegador.
// No incluyas aquí contraseñas ni claves privilegiadas.

/*
const fileContent = `// Archivo generado automáticamente durante el build.
// No editar manualmente.

export const MAPBOX_TOKEN = ${JSON.stringify(mapboxToken)};
export const SUPABASE_URL = ${JSON.stringify(supabaseUrl)};
export const SUPABASE_ANON_KEY = ${JSON.stringify(supabaseAnonKey)};
`;*/

// ==================================================
// 3. CONSTRUIR LA CARPETA DIST
// ==================================================

try {
    // Eliminar la distribución anterior para evitar archivos obsoletos.
    if (fs.existsSync(distDir)) {
        fs.rmSync(distDir, {
            recursive: true,
            force: true
        });
    }

    fs.mkdirSync(distDir, {
        recursive: true
    });

    console.log('Directorio dist preparado.');

    // ==================================================
    // 4. COPIAR ARCHIVOS ESTÁTICOS
    // ==================================================

    const htmlFiles = fs.readdirSync(rootDir).filter(file => {
        return file.endsWith('.html');
    });

    const itemsToCopy = [
        'css',
        'img',
        'js',
        ...htmlFiles
    ];

    for (const item of new Set(itemsToCopy)) {
        const sourcePath = path.join(rootDir, item);
        const destinationPath = path.join(distDir, item);

        if (!fs.existsSync(sourcePath)) {
            continue;
        }

        // No copiar archivos locales de configuración al directorio público.
        if (item === 'js' && fs.statSync(sourcePath).isDirectory()) {
            fs.cpSync(sourcePath, destinationPath, {
                recursive: true,
                filter: source => {
                    const relativePath = path.relative(
                        sourcePath,
                        source
                    );

                    const normalizedPath = relativePath.replace(/\\/g, '/');

                    // Excluir las copias de config.js.
                    return !(
                        normalizedPath === 'config.js' ||
                        normalizedPath === 'models/config.js'
                    );
                }
            });
        } else {
            fs.cpSync(sourcePath, destinationPath, {
                recursive: true
            });
        }
    }

    console.log('Archivos estáticos copiados a dist.');

    // ==================================================
    // 5. GENERAR CONFIGURACIÓN PARA EL FRONTEND
    // ==================================================

    const distJsDir = path.join(distDir, 'js');

    fs.mkdirSync(distJsDir, {
        recursive: true
    });

    const distConfigPath = path.join(
        distJsDir,
        'config.js'
    );

    fs.writeFileSync(
        distConfigPath,
        //fileContent,
        'utf8'
    );

    console.log('Configuración pública generada en dist/js/config.js.');

    // ==================================================
    // 6. COMPATIBILIDAD CON js/models/config.js
    // ==================================================

    const distModelsDir = path.join(
        distJsDir,
        'models'
    );

    if (fs.existsSync(distModelsDir)) {
        const legacyConfigPath = path.join(
            distModelsDir,
            'config.js'
        );

        fs.writeFileSync(
            legacyConfigPath,
            //fileContent,
            'utf8'
        );

        console.log(
            'Configuración compatible generada en dist/js/models/config.js.'
        );
    }

    // ==================================================
    // 7. FINALIZAR
    // ==================================================

    console.log('Build completado correctamente.');

} catch (error) {
    console.error('Error durante la construcción:', error.message);
    process.exit(1);
}
