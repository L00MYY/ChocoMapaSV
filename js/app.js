import { map, renderizarMarcadores, openPopupAndFly } from './map.js';
import { mockData } from './data.js';

// Elements
const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');

// Once map loads, add markers
map.on('load', () => {
    renderizarMarcadores(mockData);
});

// Search functionality
searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    
    // Clear results
    searchResults.innerHTML = '';
    
    if (query.length === 0) {
        searchResults.classList.add('hidden');
        return;
    }

    // Filter data
    const filtered = mockData.filter(item => 
        item.name.toLowerCase().includes(query) || 
        item.category.toLowerCase().includes(query)
    );

    if (filtered.length > 0) {
        searchResults.classList.remove('hidden');
        filtered.forEach(item => {
            const li = document.createElement('li');
            li.className = 'result-item';
            li.innerHTML = `
                <span class="result-item-title">${item.name}</span>
                <span class="result-item-category">${item.category}</span>
            `;
            
            li.addEventListener('click', () => {
                // Execute interaction flow
                openPopupAndFly(item);
                
                // Reset UI
                searchInput.value = item.name;
                searchResults.classList.add('hidden');
            });
            
            searchResults.appendChild(li);
        });
    } else {
        searchResults.classList.add('hidden');
    }
});

// Hide search results if clicked outside
document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
        searchResults.classList.add('hidden');
    }
});
