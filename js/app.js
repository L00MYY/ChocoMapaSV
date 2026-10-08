// js/app.js
import { map, renderizarMarcadores, openPopupAndFly } from './map.js';
import { obtenerLugaresTuristicos } from './supabase-config.js';

// Elementos del DOM
const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('results-list'); // Ajustado para coincidir con el HTML

// Variable para almacenar la data de Supabase y poder buscar en ella en tiempo real
let lugaresDisponibles = [];

// Inicialización: Cargar datos y renderizar cuando el mapa termine de cargar
map.on('load', async () => {
    // Obtenemos los datos desde Supabase
    lugaresDisponibles = await obtenerLugaresTuristicos();

    if (lugaresDisponibles.length > 0) {
        renderizarMarcadores(lugaresDisponibles);
    } else {
        console.warn("La base de datos de Supabase está vacía o no retornó lugares.");
    }
});

// 2. Funcionalidad de Búsqueda
searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    
    // Limpiar resultados anteriores
    searchResults.innerHTML = '';
    
    // Si el buscador está vacío, ocultar la lista
    if (query.length === 0) {
        searchResults.classList.add('hidden');
        return;
    }

    // Filtrar los datos en memoria (los que trajimos de Supabase)
    const filtered = lugaresDisponibles.filter(item => 
        item.name.toLowerCase().includes(query) || 
        item.category.toLowerCase().includes(query)
    );

    // Renderizar las coincidencias
    if (filtered.length > 0) {
        searchResults.classList.remove('hidden');
        
        filtered.forEach(item => {
            const li = document.createElement('li');
            li.className = 'result-item';
            
            // Le aplicamos el color dinámico a la categoría en los resultados
            li.innerHTML = `
                <span class="result-item-title">${item.name}</span>
                <span class="result-item-category" style="color: ${item.color || '#FF6B6B'}">${item.category}</span>
            `;
            
            // Evento al hacer clic en un resultado de la búsqueda
            li.addEventListener('click', () => {
                // Ejecutamos el flujo del mapa (Volar hacia allá y abrir tarjeta lateral)
                openPopupAndFly(item, item.color);
                
                // Reiniciar UI
                searchInput.value = item.name;
                searchResults.classList.add('hidden');
            });
            
            searchResults.appendChild(li);
        });
    } else {
        searchResults.classList.add('hidden');
    }
});

// 3. Ocultar resultados de búsqueda si se hace clic afuera del input o la lista
document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
        searchResults.classList.add('hidden');
    }
});