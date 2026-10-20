export const InicioView = {
    elements: {
        totalLugares: document.getElementById('dato-total')
    },

    actualizarTotalLugares(total) {
        if (this.elements.totalLugares) {
            this.elements.totalLugares.textContent = String(total);
        }
    }
};