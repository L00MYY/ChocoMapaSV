/**
 * @file SupabaseClient.js
 * @description Cliente base de comunicación HTTP REST con los servicios de Supabase (PostgREST).
 * Rol en el MVC: Modelo (Model / Capa de infraestructura de datos). Realiza peticiones directas vía fetch
 * a la API REST sin utilizar SDKs pesados, normalizando la estructura de datos para el resto del aplicativo.
 */

import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config.js';

/**
 * Consulta la colección completa de lugares turísticos desde la tabla 'places' en Supabase PostgREST,
 * incluyendo datos relacionados de categorías (nombre, color) y calificaciones (scores).
 * @async
 * @function obtenerLugaresTuristicos
 * @returns {Promise<Array<Object>>} Lista de lugares turísticos mapeados con coordenadas [lng, lat].
 * @throws {Error} Lanza error si la respuesta HTTP no es exitosa (capturado internamente retornando []).
 */
export async function obtenerLugaresTuristicos() {
    try {
        const params = new URLSearchParams({
            select: 'id,name,description,image_url,opening_days,latitude,longitude,department,region,is_active,categories(name,color),ratings(score)'
        });

        const url = `${SUPABASE_URL}/rest/v1/places?${params.toString()}`;

        // Petición HTTP nativa GET a Supabase PostgREST con apikey pública y token Bearer anónimo
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