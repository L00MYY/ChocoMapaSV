// js/index.js — Inicio: actualiza el total de destinos con datos reales de Supabase

const datoTotal = document.getElementById('dato-total');

async function actualizarTotal() {
    try {
        // Import dinámico: si js/config.js no existe todavía, se conserva el valor por defecto del HTML.
        const { obtenerLugaresTuristicos } = await import('./supabase-config.js');
        const lugares = await obtenerLugaresTuristicos();

        if (Array.isArray(lugares) && lugares.length > 0) {
            datoTotal.textContent = String(lugares.length);
        }
    } catch (error) {
        console.warn('No se pudo actualizar el total de destinos:', error);
    }
}

actualizarTotal();