import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const carpetas = ['js', 'scripts', 'tests'];
const archivos = [];

function buscarArchivosJS(directorio) {
  if (!fs.existsSync(directorio)) return;
  const entradas = fs.readdirSync(directorio, { withFileTypes: true });
  for (const entrada of entradas) {
    const rutaCompleta = path.join(directorio, entrada.name);
    if (entrada.isDirectory()) {
      if (entrada.name !== 'node_modules' && entrada.name !== 'dist') {
        buscarArchivosJS(rutaCompleta);
      }
    } else if (entrada.isFile() && (entrada.name.endsWith('.js') || entrada.name.endsWith('.cjs'))) {
      archivos.push(rutaCompleta);
    }
  }
}

carpetas.forEach(buscarArchivosJS);

let hayErrores = false;
for (const archivo of archivos) {
  const resultado = spawnSync(process.execPath, ['--check', archivo], { stdio: 'inherit' });
  if (resultado.status !== 0) {
    hayErrores = true;
    console.error(`✖ Error de sintaxis en: ${archivo}`);
  }
}

if (hayErrores) {
  process.exit(1);
} else {
  console.log(`✔ Sintaxis validada con éxito en ${archivos.length} archivos JavaScript.`);
}
