import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

describe('Sistema Global de Temas (ChocoMapaSV)', () => {
    let originalDocument;
    let originalWindow;
    let originalLocalStorage;
    let store;
    let documentMock;
    let windowMock;
    let elementsRegistry;

    function createMockElement(tagName, id = '') {
        const classList = new Set();
        const attributes = {};
        const children = [];

        const el = {
            tagName: tagName.toUpperCase(),
            id,
            textContent: '',
            innerHTML: '',
            parentNode: null,
            parentElement: null,
            classList: {
                add(...classes) { classes.forEach(c => classList.add(c)); },
                remove(...classes) { classes.forEach(c => classList.delete(c)); },
                contains(c) { return classList.has(c); },
                toggle(c) { if (classList.has(c)) { classList.delete(c); return false; } else { classList.add(c); return true; } }
            },
            setAttribute(k, v) { attributes[k] = String(v); },
            getAttribute(k) { return attributes[k] !== undefined ? attributes[k] : null; },
            removeAttribute(k) { delete attributes[k]; },
            appendChild(child) {
                child.parentNode = el;
                child.parentElement = el;
                children.push(child);
                return child;
            },
            insertBefore(child, reference) {
                child.parentNode = el;
                child.parentElement = el;
                const idx = children.indexOf(reference);
                if (idx !== -1) {
                    children.splice(idx, 0, child);
                } else {
                    children.push(child);
                }
                return child;
            },
            remove() {
                if (el.parentNode) {
                    const idx = el.parentNode._children?.indexOf(el);
                    if (idx !== -1 && idx !== undefined) {
                        el.parentNode._children.splice(idx, 1);
                    }
                    el.parentNode = null;
                }
                if (el.id && elementsRegistry[el.id]) {
                    delete elementsRegistry[el.id];
                }
            },
            querySelector(sel) {
                if (sel === '.nav-dropdown-menu') return elementsRegistry['nav-dropdown-menu'] || null;
                return null;
            },
            closest(sel) {
                if (sel === 'li') return el;
                return el;
            },
            addEventListener() {},
            removeEventListener() {},
            _children: children
        };
        return el;
    }

    beforeEach(() => {
        originalDocument = globalThis.document;
        originalWindow = globalThis.window;
        originalLocalStorage = globalThis.localStorage;

        store = {};
        elementsRegistry = {};

        const docElement = createMockElement('html');
        docElement.setAttribute('data-theme', 'dark');

        const navUserDropdown = createMockElement('div', 'nav-user-dropdown');
        const navDropdownMenu = createMockElement('ul', 'nav-dropdown-menu');
        const btnLogout = createMockElement('button', 'nav-btn-logout');
        const logoutLi = createMockElement('li');
        logoutLi.appendChild(btnLogout);

        const dividerLi = createMockElement('li');
        dividerLi.classList.add('nav-dropdown-divider');

        navDropdownMenu.appendChild(dividerLi);
        navDropdownMenu.appendChild(logoutLi);
        navUserDropdown.appendChild(navDropdownMenu);

        elementsRegistry['nav-user-dropdown'] = navUserDropdown;
        elementsRegistry['nav-dropdown-menu'] = navDropdownMenu;
        elementsRegistry['nav-btn-logout'] = btnLogout;

        documentMock = {
            documentElement: docElement,
            getElementById(id) {
                return elementsRegistry[id] || null;
            },
            querySelector(sel) {
                if (sel.includes('.nav-dropdown-menu')) return navDropdownMenu;
                return null;
            },
            createElement(tag) {
                const elem = createMockElement(tag);
                // Si asigna innerHTML dinámico con id, indexarlo
                let htmlVal = '';
                Object.defineProperty(elem, 'innerHTML', {
                    get() { return htmlVal; },
                    set(val) {
                        htmlVal = val;
                        if (val.includes('id="btn-theme-toggle"')) {
                            const btn = createMockElement('div', 'btn-theme-toggle');
                            const icon = createMockElement('span', 'theme-icon-indicator');
                            const text = createMockElement('span', 'theme-text-indicator');
                            elementsRegistry['btn-theme-toggle'] = btn;
                            elementsRegistry['theme-icon-indicator'] = icon;
                            elementsRegistry['theme-text-indicator'] = text;
                        }
                    }
                });
                return elem;
            },
            addEventListener() {}
        };

        windowMock = {
            matchMedia: (query) => ({
                matches: query.includes('dark'),
                addEventListener() {},
                removeEventListener() {}
            }),
            dispatchEvent() {},
            location: { pathname: '/index.html', search: '', hash: '' }
        };

        const localStorageMock = {
            getItem: (key) => store[key] !== undefined ? store[key] : null,
            setItem: (key, val) => { store[key] = String(val); },
            removeItem: (key) => { delete store[key]; },
            clear: () => { Object.keys(store).forEach(k => delete store[k]); }
        };

        globalThis.document = documentMock;
        globalThis.window = windowMock;
        globalThis.localStorage = localStorageMock;
    });

    afterEach(() => {
        globalThis.document = originalDocument;
        globalThis.window = originalWindow;
        globalThis.localStorage = originalLocalStorage;
    });

    it('debe detectar tema por defecto "dark" cuando localStorage está vacío', async () => {
        const { resolverTemaPreferido } = await import('../js/controllers/NavbarController.js');
        assert.equal(resolverTemaPreferido(), 'dark');
    });

    it('debe respetar el tema guardado en localStorage ("light")', async () => {
        globalThis.localStorage.setItem('chocomapa_theme', 'light');
        const { resolverTemaPreferido } = await import('../js/controllers/NavbarController.js');
        assert.equal(resolverTemaPreferido(), 'light');
    });

    it('debe inyectar el switch de tema en el menú de usuario', async () => {
        const { NavbarView } = await import('../js/views/NavbarView.js');
        NavbarView.inyectarThemeToggle('dark');

        const toggleBtn = documentMock.getElementById('btn-theme-toggle');
        assert.ok(toggleBtn, 'El botón de toggle debe existir en el DOM');

        const icon = documentMock.getElementById('theme-icon-indicator');
        const text = documentMock.getElementById('theme-text-indicator');
        assert.equal(icon.textContent, '🌙');
        assert.equal(text.textContent, 'Modo Oscuro');
    });

    it('debe actualizar los indicadores a modo claro cuando el tema cambia a "light"', async () => {
        const { NavbarView } = await import('../js/views/NavbarView.js');
        NavbarView.inyectarThemeToggle('dark');
        NavbarView.actualizarIndicadorTema('light');

        const icon = documentMock.getElementById('theme-icon-indicator');
        const text = documentMock.getElementById('theme-text-indicator');
        assert.equal(icon.textContent, '☀️');
        assert.equal(text.textContent, 'Modo Claro');
    });

    it('debe alternar de oscuro a claro y persistir en localStorage a través del Controller', async () => {
        const { NavbarController } = await import('../js/controllers/NavbarController.js');
        NavbarController.aplicarTema('dark');
        assert.equal(documentMock.documentElement.getAttribute('data-theme'), 'dark');
        assert.equal(globalThis.localStorage.getItem('chocomapa_theme'), 'dark');

        NavbarController.alternarTema();
        assert.equal(documentMock.documentElement.getAttribute('data-theme'), 'light');
        assert.equal(globalThis.localStorage.getItem('chocomapa_theme'), 'light');

        NavbarController.alternarTema();
        assert.equal(documentMock.documentElement.getAttribute('data-theme'), 'dark');
        assert.equal(globalThis.localStorage.getItem('chocomapa_theme'), 'dark');
    });

    it('debe remover el toggle al ejecutar removerThemeToggle()', async () => {
        const { NavbarView } = await import('../js/views/NavbarView.js');
        NavbarView.inyectarThemeToggle('dark');
        elementsRegistry['nav-theme-item-wrapper'] = createMockElement('li', 'nav-theme-item-wrapper');

        NavbarView.removerThemeToggle();
        assert.equal(documentMock.getElementById('nav-theme-item-wrapper'), null);
    });
});
