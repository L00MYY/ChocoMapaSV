import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config.js';

export async function obtenerLugaresTuristicos() {
    try {
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
            coords: [lugar.longitude, lugar.latitude],
            ratings: Array.isArray(lugar.ratings) ? lugar.ratings : []
        }));

    } catch (error) {
        console.error('Fallo al conectarse con Supabase:', error);
        return [];
    }
}