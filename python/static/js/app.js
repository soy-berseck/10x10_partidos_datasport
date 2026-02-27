/**
 * App.js - Controlador principal SPA
 * Gestiona autenticación, navegación y estado global
 */

const App = {
  currentUser: null,
  currentPage: 'dashboard',

  // ─── Páginas disponibles ──────────────────────────────────────────────────
  get pages() {
    return {
      dashboard:             { label: 'Inicio', icon: '🏠', render: window.Pages.Dashboard },
      calendar:              { label: 'Calendario', icon: '📅', render: window.Pages.Calendar },
      liveScoring:           { label: 'En Vivo', icon: '🔴', render: window.Pages.LiveScoring },
      results:               { label: 'Resultados', icon: '📊', render: window.Pages.Results },
      statistics:            { label: 'Estadísticas', icon: '📈', render: window.Pages.Statistics },
      standings:             { label: 'Tablas', icon: '🏆', render: window.Pages.Standings },
      teams:                 { label: 'Equipos', icon: '👥', render: window.Pages.Teams },
      schools:               { label: 'Colegios', icon: '🏫', render: window.Pages.Schools },
      players:               { label: 'Jugadores', icon: '⚽', render: window.Pages.Players },
      registerTeamsPlayers:  { label: 'Registrar', icon: '📝', render: window.Pages.Register },
      generateSchedule:      { label: 'Programar', icon: '🗓️', render: window.Pages.Schedule },
    };
  },

  login(role) {
    this.currentUser = { role, email: `${role}@datasport.co` };
    sessionStorage.setItem('ds_user', JSON.stringify(this.currentUser));
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');
    document.getElementById('user-badge').textContent = `${role === 'editor' ? '✏️' : '📖'} ${this.currentUser.email}`;
    this._buildNav();
    this.navigate('dashboard');
  },

  logout() {
    sessionStorage.removeItem('ds_user');
    this.currentUser = null;
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('main-app').classList.add('hidden');
  },

  isEditor() {
    return this.currentUser?.role === 'editor';
  },

  _buildNav() {
    const nav = document.getElementById('main-nav');
    nav.innerHTML = '';
    for (const [key, page] of Object.entries(this.pages)) {
      const btn = document.createElement('button');
      btn.className = 'nav-tab';
      btn.id = `nav-${key}`;
      btn.textContent = `${page.icon} ${page.label}`;
      btn.onclick = () => this.navigate(key);
      nav.appendChild(btn);
    }
  },

  navigate(page, options = {}) {
    this.currentPage = page;
    // Actualizar clases de nav
    document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
    const activeBtn = document.getElementById(`nav-${page}`);
    if (activeBtn) activeBtn.classList.add('active');

    const container = document.getElementById('page-content');
    container.innerHTML = Utils.spinner();

    const pageObj = this.pages[page];
    if (pageObj && typeof pageObj.render === 'function') {
      pageObj.render(container, options);
    } else {
      container.innerHTML = `<div class="text-center text-red-400 mt-20 text-xl">Página "${page}" no encontrada</div>`;
    }
  },

  // Inicialización - restaurar sesión si existe
  init() {
    const stored = sessionStorage.getItem('ds_user');
    if (stored) {
      try {
        const user = JSON.parse(stored);
        this.login(user.role);
      } catch { }
    }
  },
};

// Hacer App global para que los onclick del HTML funcionen
window.App = App;

// Iniciar al cargar
document.addEventListener('DOMContentLoaded', () => App.init());
