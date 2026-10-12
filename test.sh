#!/bin/bash
echo "=== Iniciando suite de pruebas de integridad web ==="

# 1. Comprobar que los archivos esenciales existan
archivos=("index.html" "mapa.html" "css/styles.css" "js/app.js" "js/map.js")

for archivo in "${archivos[@]}"; do
    if [ -f "$archivo" ]; then
        echo "✔ $archivo encontrado."
    else
        echo "✖ ERROR: Falta el archivo crítico $archivo"
        exit 1
    fi
done

# 2. Comprobar que mapa.html tenga el contenedor del mapa
if grep -q 'id="map"' mapa.html; then
    echo "✔ Contenedor #map verificado en mapa.html."
else
    echo "✖ ERROR: No se encontró el contenedor #map en mapa.html"
    exit 1
fi

echo "=== Todas las pruebas pasaron con éxito ==="
exit 0