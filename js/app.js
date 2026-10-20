(function(window) {
  'use strict';

  /* ── Router ──────────────────────────────────────────── */
  async function route() {
    const hash = window.location.hash || '#hoy';
    const main = document.getElementById('main');
    if (!main) return;

    main.innerHTML = '<div class="loading">Cargando…</div>';

    // Highlight nav
    document.querySelectorAll('.nav-link').forEach(el => {
      el.classList.toggle('nav-link--active', hash.startsWith(el.dataset.view || el.getAttribute('href') || ''));
    });

    try {
      if (hash === '#hoy') {
        await Views.Hoy.render(main);
      } else if (hash === '#semana') {
        await Views.Semana.render(main);
      } else if (hash === '#portafolio') {
        await Views.Portafolio.render(main);
      } else if (hash.startsWith('#proyecto/')) {
        const id = hash.replace('#proyecto/', '');
        await Views.Proyecto.render(main, id);
      } else if (hash.startsWith('#subproyecto/')) {
        const id = hash.replace('#subproyecto/', '');
        await Views.Subproyecto.render(main, id);
      } else if (hash === '#config') {
        await Views.Config.render(main);
      } else {
        await Views.Hoy.render(main);
      }
    } catch(err) {
      console.error('Route error:', err);
      main.innerHTML = `<div class="alert alert--danger">Error cargando la vista: ${Utils.escape(err.message)}</div>`;
    }
  }

  /* ── Theme ───────────────────────────────────────────── */
  async function applyTheme() {
    const tema = await DB.getConfig('tema');
    if (tema === 'light' || tema === 'dark') {
      document.documentElement.dataset.theme = tema;
    } else {
      delete document.documentElement.dataset.theme;
    }
  }

  /* ── Nav active state helper ─────────────────────────── */
  function updateNav() {
    const hash = window.location.hash || '#hoy';
    document.querySelectorAll('[data-nav]').forEach(el => {
      const target = el.dataset.nav;
      const isActive = hash === target || hash.startsWith(target + '/');
      el.classList.toggle('nav-link--active', isActive);
    });
  }

  /* ── Init ────────────────────────────────────────────── */
  async function init() {
    try {
      await DB.init();
      await applyTheme();
      Views.Hoy.init();

      window.addEventListener('hashchange', () => { route(); updateNav(); });
      Utils.on('nav', (data) => {
        if (data && data.view) window.location.hash = '#' + data.view;
      });
      Utils.on('data-changed', () => {
        route();
      });

      await route();
      updateNav();

      // PWA notification permission
      if ('Notification' in window && Notification.permission === 'default') {
        setTimeout(() => Utils.requestNotificationPermission(), 3000);
      }

      // Register service worker
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
      }
    } catch(err) {
      console.error('Init error:', err);
      document.getElementById('main').innerHTML =
        `<div class="alert alert--danger">Error al iniciar la aplicación: ${err.message}</div>`;
    }
  }

  // Wait for DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.App = { route, init };

})(window);
