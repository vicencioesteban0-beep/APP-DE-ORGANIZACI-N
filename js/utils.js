(function(window) {
  'use strict';

  const DIAS  = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
  const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const DIAS_C= ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

  /* ── Date helpers ─────────────────────────────────── */
  function hoy()  { return new Date().toISOString().split('T')[0]; }
  function ahora(){ return new Date().toTimeString().slice(0,5); }

  function parseDate(str) {
    return str ? new Date(str + 'T12:00:00') : null;
  }

  function formatFecha(str, opts = {}) {
    if (!str) return '—';
    const d = parseDate(str);
    if (opts.corto)  return `${d.getDate()} ${MESES[d.getMonth()].slice(0,3)}`;
    if (opts.largo)  return `${DIAS[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
    if (opts.semana) return `${DIAS_C[d.getDay()]} ${d.getDate()}/${d.getMonth()+1}`;
    return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
  }

  function formatHoras(h) {
    if (h == null || isNaN(h)) return '—';
    const hrs = Math.floor(h);
    const min = Math.round((h - hrs) * 60);
    if (hrs === 0) return `${min} min`;
    if (min === 0) return `${hrs} h`;
    return `${hrs} h ${min} min`;
  }

  function formatMinutos(m) {
    if (!m) return '—';
    const h = Math.floor(m / 60);
    const min = m % 60;
    if (h === 0) return `${min} min`;
    if (min === 0) return `${h} h`;
    return `${h} h ${min} min`;
  }

  function formatTiempo(seg) {
    const m = Math.floor(seg / 60);
    const s = seg % 60;
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }

  function diasHabilesEntre(d1str, d2str) {
    const d1 = parseDate(d1str), d2 = parseDate(d2str);
    let count = 0;
    const cur = new Date(d1);
    while (cur <= d2) {
      const day = cur.getDay();
      if (day !== 0 && day !== 6) count++;
      cur.setDate(cur.getDate() + 1);
    }
    return count;
  }

  function diasHabilesDesdeHoy(fechaStr) {
    if (!fechaStr) return null;
    const h = hoy();
    if (fechaStr < h) return -diasHabilesEntre(fechaStr, h);
    return diasHabilesEntre(h, fechaStr);
  }

  function addDiasHabiles(fechaStr, dias) {
    const d = parseDate(fechaStr);
    let added = 0;
    while (added < Math.abs(dias)) {
      d.setDate(d.getDate() + (dias > 0 ? 1 : -1));
      if (d.getDay() !== 0 && d.getDay() !== 6) added++;
    }
    return d.toISOString().split('T')[0];
  }

  function semanaActual() {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const lunes = new Date(d.setDate(diff));
    return Array.from({length:7}, (_,i) => {
      const f = new Date(lunes);
      f.setDate(f.getDate() + i);
      return f.toISOString().split('T')[0];
    });
  }

  function semanaDesde(inicioStr) {
    const d = parseDate(inicioStr);
    return Array.from({length:7}, (_,i) => {
      const f = new Date(d);
      f.setDate(f.getDate() + i);
      return f.toISOString().split('T')[0];
    });
  }

  function esDiaHabil(str) {
    const d = parseDate(str);
    return d.getDay() !== 0 && d.getDay() !== 6;
  }

  /* ── Labels & colors ─────────────────────────────── */
  function labelEstado(e) {
    return { por_hacer:'Por hacer', agendada:'Agendada', en_curso:'En curso',
             esperando:'Esperando', hecha:'Hecha', por_replantear:'Por replantear',
             activo:'Activo', bloqueado:'Bloqueado', listo:'Listo' }[e] || e;
  }

  function labelTipoTrabajo(t) {
    return { produccion:'Producción', coordinacion:'Coordinación',
             comprobacion:'Comprobación', planificacion:'Planificación' }[t] || t;
  }

  function labelDemanda(d) {
    return { alta:'Alta', media:'Media', mecanica:'Mecánica' }[d] || d;
  }

  function labelEtapa(e) {
    return { produccion:'Producción', espera:'Espera externa', ajustes:'Ajustes',
             colchon:'Colchón', listo:'Listo' }[e] || e;
  }

  function labelTipoBloque(t) {
    return { produccion_alta:'Producción alta', produccion_media:'Producción media',
             coordinacion:'Coordinación', comprobacion:'Comprobación',
             rutina:'Rutina', pausa:'Pausa', margen:'Margen' }[t] || t;
  }

  function semaforo(pct) {
    if (pct >= 15) return 'verde';
    if (pct >= 0)  return 'ambar';
    return 'rojo';
  }

  /* ── String helpers ──────────────────────────────── */
  function escape(s) {
    if (!s) return '';
    return String(s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  function truncate(s, n = 60) {
    if (!s) return '';
    return s.length > n ? s.slice(0,n) + '…' : s;
  }

  function initials(name) {
    if (!name) return '?';
    return name.split(' ').slice(0,2).map(w => w[0]?.toUpperCase()).join('');
  }

  /* ── Event bus ───────────────────────────────────── */
  const _bus = {};
  function on(evt, cb)  { (_bus[evt] || (_bus[evt]=[])).push(cb); }
  function off(evt, cb) { if (_bus[evt]) _bus[evt] = _bus[evt].filter(f => f !== cb); }
  function emit(evt, d) { (_bus[evt] || []).forEach(f => f(d)); }

  /* ── Toast ───────────────────────────────────────── */
  function toast(msg, type = 'info', ms = 3200) {
    const c = document.getElementById('toast-container');
    if (!c) return;
    const el = document.createElement('div');
    el.className = `toast toast--${type}`;
    el.textContent = msg;
    c.appendChild(el);
    requestAnimationFrame(() => { el.classList.add('toast--visible'); });
    setTimeout(() => {
      el.classList.remove('toast--visible');
      setTimeout(() => el.remove(), 350);
    }, ms);
  }

  /* ── Modal ───────────────────────────────────────── */
  let _escHandler = null;
  function modal(html, onClose) {
    const ov = document.getElementById('modal-overlay');
    const mc = document.getElementById('modal-container');
    if (!ov || !mc) return;
    mc.innerHTML = html;
    ov.classList.remove('hidden');
    mc.classList.remove('hidden');
    ov.onclick = e => { if (e.target === ov) closeModal(onClose); };
    if (_escHandler) document.removeEventListener('keydown', _escHandler);
    _escHandler = e => { if (e.key === 'Escape') closeModal(onClose); };
    document.addEventListener('keydown', _escHandler);
    mc.querySelector('input, textarea, select, button')?.focus();
  }

  function closeModal(cb) {
    const ov = document.getElementById('modal-overlay');
    const mc = document.getElementById('modal-container');
    if (!ov || !mc) return;
    ov.classList.add('hidden');
    mc.classList.add('hidden');
    mc.innerHTML = '';
    if (_escHandler) { document.removeEventListener('keydown', _escHandler); _escHandler = null; }
    if (cb) cb();
  }

  function confirm(msg) {
    return new Promise(resolve => {
      modal(`
        <div class="modal-dialog">
          <p class="modal-dialog__msg">${escape(msg)}</p>
          <div class="modal-dialog__btns">
            <button class="btn btn--ghost" id="md-cancel">Cancelar</button>
            <button class="btn btn--primary" id="md-ok">Confirmar</button>
          </div>
        </div>
      `);
      document.getElementById('md-ok').onclick     = () => { closeModal(); resolve(true); };
      document.getElementById('md-cancel').onclick = () => { closeModal(); resolve(false); };
    });
  }

  /* ── Notification (Web Notifications API) ───────── */
  async function requestNotificationPermission() {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    const p = await Notification.requestPermission();
    return p === 'granted';
  }

  function notify(title, body, icon = '/icons/icon-192.png') {
    if (Notification.permission !== 'granted') return;
    try { new Notification(title, { body, icon }); } catch(e) {}
  }

  window.Utils = {
    hoy, ahora, parseDate,
    formatFecha, formatHoras, formatMinutos, formatTiempo,
    diasHabilesEntre, diasHabilesDesdeHoy, addDiasHabiles,
    semanaActual, semanaDesde, esDiaHabil,
    labelEstado, labelTipoTrabajo, labelDemanda, labelEtapa, labelTipoBloque,
    semaforo, escape, truncate, initials,
    on, off, emit,
    toast, modal, closeModal, confirm,
    requestNotificationPermission, notify
  };

})(window);
