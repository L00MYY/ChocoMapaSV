// js/supabase-config.js
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

export async function obtenerLugaresTuristicos() {
    try {
        // Consumimos la vista que ya entrega 'coords' como array [lng, lat]
        const url = `${SUPABASE_URL}/rest/v1/places_map_view?select=*`;

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

        // La vista ya devuelve el shape exacto que consume map.js:
        // { id, name, category, color, coords, description, image_url, discount }
        const lugares = await respuesta.json();
        return lugares;

    } catch (error) {
        console.error("Fallo al conectarse con Supabase:", error);
        return [];
    }
}