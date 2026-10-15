// js/supabase-config.js
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

export async function obtenerLugaresTuristicos() {
    try {
        // Consultamos la tabla places directamente para poder incluir
        // la relación ratings(score) y la columna opening_days.
        // Se mantiene el join con categories para obtener color y nombre de categoría.
        const params = new URLSearchParams({
            select: 'id,name,description,image_url,opening_days,latitude,longitude,department,region,is_active,categories(name,color),ratings(score)'
        });

        const url = `${SUPABASE_URL}/rest/v1/places?${params.toString()}`;

        const respuesta = await fetch(url, {
            method: 'GET',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (!respuesta.ok) {
            throw new Error(`Error de red o permisos: ${respuesta.status}`);
        }

        const datos = await respuesta.json();

        // Transformar al shape que consume map.js:
        // { id, name, category, color, coords, description, image_url, opening_days, ratings }
        return datos.map(lugar => ({
            id: lugar.id,
            name: lugar.name,
            description: lugar.description || '',
            image_url: lugar.image_url || '',
            opening_days: lugar.opening_days || '',
            department: lugar.department || '',
            region: lugar.region || '',
            is_active: lugar.is_active,
            category: lugar.categories?.name || 'Turismo',
            color: lugar.categories?.color || '#FF6B6B',
            // Mapbox requiere [lng, lat]
            coords: [lugar.longitude, lugar.latitude],
            // Arreglo de objetos { score } para calcular promedio en el frontend
            ratings: Array.isArray(lugar.ratings) ? lugar.ratings : []
        }));

    } catch (error) {
        console.error('Fallo al conectarse con Supabase:', error);
        return [];
    }
}