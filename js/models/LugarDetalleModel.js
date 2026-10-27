import { SUPABASE_URL_B64, SUPABASE_ANON_KEY_B64 } from '../config.js';
import { obtenerToursPorLugar } from './ToursModel.js';

// Decodificamos en memoria al momento de ejecutar el código
const SUPABASE_URL = atob(SUPABASE_URL_B64);
const SUPABASE_ANON_KEY = atob(SUPABASE_ANON_KEY_B64);

export const LugarDetalleModel = {
    async obtenerPorId(id) {
        if (!id) return null;

        try {
            const params = new URLSearchParams({
                id: `eq.${id}`,
                select: 'id,name,description,image_url,opening_days,opening_time,closing_time,department,region,is_active,latitude,longitude,categories(name,color),place_services(services(name)),ratings(score)'
            });
            const respuesta = await fetch(`${SUPABASE_URL}/rest/v1/places?${params}`, {
                headers: {
                    apikey: SUPABASE_ANON_KEY,
                    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!respuesta.ok) throw new Error(`Supabase respondió ${respuesta.status}`);
            const datos = await respuesta.json();
            return Array.isArray(datos) ? (datos[0] || null) : null;
        } catch (error) {
            console.error('Error al consultar el detalle del sitio en Supabase:', error);
            return null;
        }
    },

    obtenerTours(idLugar) {
        return obtenerToursPorLugar(idLugar);
    }
};