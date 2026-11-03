/**
 * js/models/SupabaseClient.js
 * Cliente de consulta desacoplado para recursos públicos de Supabase PostgREST (MITUR)
 */

import { SUPABASE_URL_B64, SUPABASE_ANON_KEY_B64 } from '../config.js';
import { generarSlug } from '../utils/textUtils.js';

// Decodificación segura en memoria en tiempo de ejecución
const SUPABASE_URL = typeof atob === 'function' && !SUPABASE_URL_B64.startsWith('http')
    ? atob(SUPABASE_URL_B64)
    : SUPABASE_URL_B64;
const SUPABASE_ANON_KEY = typeof atob === 'function' && !SUPABASE_ANON_KEY_B64.startsWith('sb_')
    ? atob(SUPABASE_ANON_KEY_B64)
    : SUPABASE_ANON_KEY_B64;

/**
 * @description Obtiene el listado completo de lugares turísticos activos desde Supabase PostgREST,
 * incluyendo categorías y ratings asociados, transformándolos a la entidad estandarizada del modelo.
 * @returns {Promise<Array<Object>>} Promesa que resuelve al catálogo de lugares turísticos mapeados.
 */
export async function obtenerLugaresTuristicos() {
    try {
        const params = new URLSearchParams({
            select: 'id,name,description,image_url,opening_days,latitude,longitude,department,region,is_active,categories(id,name,slug,color),ratings(score)'
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
            throw new Error(`Error de red o permisos al consultar lugares: ${respuesta.status}`);
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
            category_slug: lugar.categories?.slug || generarSlug(lugar.categories?.name || 'Turismo'),
            color: lugar.categories?.color || '#FF6B6B',
            coords: [lugar.longitude, lugar.latitude],
            ratings: Array.isArray(lugar.ratings) ? lugar.ratings : []
        }));

    } catch (error) {
        console.error('Fallo al conectarse con Supabase en obtenerLugaresTuristicos:', error);
        return [];
    }
}

/**
 * @description Consulta el listado de categorías turísticas oficiales registradas en Supabase PostgREST.
 * @returns {Promise<Array<Object>>} Promesa que resuelve a la lista de categorías ordenadas por nombre.
 */
export async function obtenerCategorias() {
    try {
        const params = new URLSearchParams({
            select: 'id,name,slug,color,icon',
            order: 'name.asc'
        });

        const url = `${SUPABASE_URL}/rest/v1/categories?${params.toString()}`;

        const respuesta = await fetch(url, {
            method: 'GET',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (!respuesta.ok) {
            throw new Error(`Error al obtener categorías: ${respuesta.status}`);
        }

        return await respuesta.json();
    } catch (error) {
        console.error('Fallo al consultar categorías de Supabase:', error);
        return [];
    }
}
