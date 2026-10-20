(function(window) {
  'use strict';

  let _timerInterval = null;
  let _timerTareaId  = null;
  let _timerSeg      = 0;
  let _timerStart    = null;

  /* ── Timer persistence ──────────────────────────────── */
  function _saveTimer() {
    try {
      localStorage.setItem('timer', JSON.stringify({
        tareaId: _timerTareaId,
        seg: _timerSeg,
        start: _timerStart
      }));
    } catch(e) {}
  }

  function _loadTimer() {
    try {
      const d = JSON.parse(localStorage.getItem('timer') || 'null');
      if (!d) return;
      _timerTareaId = d.tareaId;
      _timerSeg     = d.seg || 0;
      _timerStart   = d.start;
      if (_timerStart) {
        const elapsed = Math.floor((Date.now() - new Date(_timerStart).getTime()) / 1000);
        _timerSeg += elapsed;
        _timerStart = new Date().toISOString();
        _startInterval();
      }
    } catch(e) {}
  }

  function _clearTimer() {
    clearInterval(_timerInterval);
    _timerInterval = null;
    _timerTareaId  = null;
    _timerSeg      = 0;
    _timerStart    = null;
    try { localStorage.removeItem('timer'); } catch(e) {}
  }

  function _startInterval() {
    clearInterval(_timerInterval);
    _timerInterval = setInterval(() => {
      _timerSeg++;
      _saveTimer();
      const el = document.getElementById('timer-display-' + _timerTareaId);
      if (el) el.textContent = Utils.formatTiempo(_timerSeg);
    }, 1000);
  }

  /* ── Acciones de tarea ──────────────────────────────── */
  async function empezarTarea(tareaId) {
    if (_timerTareaId && _timerTareaId !== tareaId) {
      const ok = await Utils.confirm('Hay un timer activo en otra tarea. ¿Pausarlo y empezar ésta?');
      if (!ok) return;
      await pausarTarea(_timerTareaId);
    }
    const t = await DB.getById(DB.S.T, tareaId);
    if (!t) return;
    await DB.put(DB.S.T, { ...t, estado: 'en_curso' });
    _timerTareaId = tareaId;
    _timerStart   = new Date().toISOString();
    _startInterval();
    _saveTimer();
    Utils.emit('data-changed', { store: DB.S.T });
    Utils.toast('Timer iniciado — primer paso: ' + (t.primerPaso || ''), 'info', 4000);
  }

  async function pausarTarea(tareaId) {
    if (_timerTareaId !== tareaId) return;
    clearInterval(_timerInterval);
    _timerInterval = null;
    _timerStart    = null;
    _saveTimer();
    Utils.emit('data-changed', { store: DB.S.T });
  }

  async function cerrarTarea(tareaId) {
    const t = await DB.getById(DB.S.T, tareaId);
    if (!t) return;
    const tiempoReal = Math.round(_timerTareaId === tareaId ? _timerSeg / 3600 * 100) / 100 : null;

    Utils.modal(`
      <div class="modal-form">
        <h2 class="modal-form__title">Cerrar tarea</h2>
        <p class="modal-form__subtitle">${Utils.escape(t.nombre)}</p>
        <div class="form-group">
          <label class="form-label">Tiempo real (horas)</label>
          <input id="ci-tiempo" type="number" step="0.1" min="0" class="form-input"
            value="${tiempoReal !== null ? tiempoReal : ''}" placeholder="ej: 1.5">
        </div>
        <div class="form-group">
          <label class="form-label">Notas (opcional)</label>
          <textarea id="ci-notas" class="form-textarea" rows="2" placeholder="¿Algo que destacar?"></textarea>
        </div>
        <div class="modal-form__actions">
          <button class="btn btn--ghost" id="ci-cancel">Cancelar</button>
          <button class="btn btn--success" id="ci-ok">Marcar hecha</button>
        </div>
      </div>
    `);
    document.getElementById('ci-cancel').onclick = () => Utils.closeModal();
    document.getElementById('ci-ok').onclick = async () => {
      const tr = parseFloat(document.getElementById('ci-tiempo').value) || tiempoReal;
      await DB.put(DB.S.T, { ...t, estado: 'hecha', tiempoReal: tr || null });
      if (_timerTareaId === tareaId) _clearTimer();
      Utils.closeModal();
      Utils.emit('data-changed', { store: DB.S.T });
      Utils.toast('Tarea cerrada', 'success');
      await _registrarMetricaSiProcede(t, tr);
    };
  }

  async function _registrarMetricaSiProcede(tarea, tiempoReal) {
    if (!tiempoReal || !tarea.estimadoBase) return;
    await DB.put(DB.S.M, {
      fecha: Utils.hoy(),
      tipo: 'cierre_tarea',
      tareaId: tarea.id,
      estimado: tarea.estimadoBase,
      real: tiempoReal,
      ratio: Math.round((tiempoReal / tarea.estimadoBase) * 100) / 100
    });
  }

  async function noEmpece(tareaId) {
    const t = await DB.getById(DB.S.T, tareaId);
    if (!t) return;
    if (_timerTareaId === tareaId) { clearInterval(_timerInterval); _timerInterval = null; }

    Utils.modal(`
      <div class="modal-form">
        <h2 class="modal-form__title">No empecé: ¿qué pasó?</h2>
        <p class="modal-form__subtitle">${Utils.escape(t.nombre)}</p>
        <div class="form-group">
          <div class="toggle-btn-group">
            <button class="toggle-btn" data-val="dividir" onclick="Views.Hoy._toggleNoEmpece(this)">Dividir primer paso</button>
            <button class="toggle-btn" data-val="recuperar" onclick="Views.Hoy._toggleNoEmpece(this)">Mover a recuperación</button>
            <button class="toggle-btn" data-val="replantear" onclick="Views.Hoy._toggleNoEmpece(this)">Replantear</button>
          </div>
        </div>
        <div id="ne-dividir" class="ne-panel hidden">
          <div class="form-group">
            <label class="form-label">Nuevo primer paso (más pequeño)</label>
            <input id="ne-paso" type="text" class="form-input" placeholder="¿Qué puedo hacer en 5 min?" maxlength="200">
          </div>
        </div>
        <div class="modal-form__actions">
          <button class="btn btn--ghost" id="ne-cancel">Cancelar</button>
          <button class="btn btn--primary" id="ne-ok">Aplicar</button>
        </div>
      </div>
    `);
    document.getElementById('ne-cancel').onclick = () => Utils.closeModal();
    document.getElementById('ne-ok').onclick = async () => {
      const opcion = document.querySelector('.toggle-btn.active[data-val]')?.dataset.val;
      if (!opcion) { Utils.toast('Elige una opción', 'warning'); return; }
      if (opcion === 'dividir') {
        const nuevoPaso = document.getElementById('ne-paso')?.value.trim();
        if (!nuevoPaso) { Utils.toast('Escribe el nuevo primer paso', 'warning'); return; }
        await DB.put(DB.S.T, { ...t, primerPaso: nuevoPaso, estado: 'agendada' });
        Utils.toast('Primer paso actualizado', 'success');
      } else if (opcion === 'recuperar') {
        const viernesProx = _proximoViernes();
        await DB.put(DB.S.T, { ...t, fechaAgendada: viernesProx, estado: 'agendada' });
        Utils.toast('Movida al bloque de recuperación del viernes', 'info');
      } else {
        await DB.put(DB.S.T, { ...t, estado: 'por_replantear', fechaAgendada: null });
        Utils.toast('Movida a "Por replantear"', 'warning');
      }
      Utils.closeModal();
      Utils.emit('data-changed', { store: DB.S.T });
    };
  }

  function _toggleNoEmpece(btn) {
    document.querySelectorAll('.toggle-btn[data-val]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('ne-dividir').classList.toggle('hidden', btn.dataset.val !== 'dividir');
  }

  function _proximoViernes() {
    const d = new Date();
    const dow = d.getDay();
    const diff = dow <= 5 ? 5 - dow : 6;
    d.setDate(d.getDate() + (diff === 0 ? 7 : diff));
    return d.toISOString().split('T')[0];
  }

  async function marcarEsperando(tareaId) {
    const t = await DB.getById(DB.S.T, tareaId);
    if (!t) return;
    Utils.modal(`
      <div class="modal-form">
        <h2 class="modal-form__title">Esperando a…</h2>
        <p class="modal-form__subtitle">${Utils.escape(t.nombre)}</p>
        <div class="form-group">
          <label class="form-label">¿A quién esperas?</label>
          <input id="esp-quien" type="text" class="form-input" value="${Utils.escape(t.esperandoA||'')}" placeholder="Nombre o rol" maxlength="100">
        </div>
        <div class="form-group">
          <label class="form-label">¿Hasta cuándo? (4 días hábiles recomendado)</label>
          <input id="esp-hasta" type="date" class="form-input" value="${t.esperandoHasta||''}">
        </div>
        <div class="modal-form__actions">
          <button class="btn btn--ghost" id="esp-cancel">Cancelar</button>
          <button class="btn btn--primary" id="esp-ok">Guardar</button>
        </div>
      </div>
    `);
    document.getElementById('esp-cancel').onclick = () => Utils.closeModal();
    document.getElementById('esp-ok').onclick = async () => {
      const quien = document.getElementById('esp-quien').value.trim();
      const hasta = document.getElementById('esp-hasta').value;
      if (!quien) { Utils.toast('Indica a quién esperas', 'warning'); return; }
      await DB.put(DB.S.T, { ...t, estado: 'esperando', esperandoA: quien, esperandoHasta: hasta || null });
      Utils.closeModal();
      Utils.emit('data-changed', { store: DB.S.T });
      Utils.toast('Tarea en espera registrada', 'info');
    };
  }

  async function llegóRespuesta(tareaId) {
    const t = await DB.getById(DB.S.T, tareaId);
    if (!t) return;
    await DB.put(DB.S.T, { ...t, estado: 'por_hacer', esperandoA: null, esperandoHasta: null });
    Utils.emit('data-changed', { store: DB.S.T });
    Utils.toast('Tarea liberada de espera', 'success');
  }

  async function entróUrgente(tareaId) {
    const t = await DB.getById(DB.S.T, tareaId);
    if (!t) return;
    const hoy = Utils.hoy();
    const bloques = await Capacidad.getBloques();
    const desplazadas = [];
    const tareasHoy = await DB.getTareasParaHoy(hoy);
    tareasHoy.filter(tt => tt.id !== tareaId).forEach(tt => desplazadas.push(tt));

    Utils.modal(`
      <div class="modal-form">
        <h2 class="modal-form__title">Entró urgente</h2>
        <p class="modal-form__subtitle">Se agendará <strong>${Utils.escape(t.nombre)}</strong> hoy.</p>
        ${desplazadas.length ? `<p class="alert alert--warning">${desplazadas.length} tarea(s) desplazada(s) irán a "Por replantear"</p>` : ''}
        <div class="modal-form__actions">
          <button class="btn btn--ghost" id="urg-cancel">Cancelar</button>
          <button class="btn btn--danger" id="urg-ok">Confirmar</button>
        </div>
      </div>
    `);
    document.getElementById('urg-cancel').onclick = () => Utils.closeModal();
    document.getElementById('urg-ok').onclick = async () => {
      await DB.put(DB.S.T, { ...t, estado: 'agendada', fechaAgendada: hoy });
      for (const d of desplazadas) {
        if (!['hecha','esperando'].includes(d.estado))
          await DB.put(DB.S.T, { ...d, estado: 'por_replantear', fechaAgendada: null });
      }
      Utils.closeModal();
      Utils.emit('data-changed', { store: DB.S.T });
      Utils.toast('Urgente agendada', 'warning');
    };
  }

  async function replantearTarea(tareaId) {
    const t = await DB.getById(DB.S.T, tareaId);
    if (!t) return;
    await DB.put(DB.S.T, { ...t, estado: 'por_replantear', fechaAgendada: null });
    if (_timerTareaId === tareaId) _clearTimer();
    Utils.emit('data-changed', { store: DB.S.T });
    Utils.toast('Movida a Por replantear', 'warning');
  }

  /* ── Bandeja Por Replantear ─────────────────────────── */
  async function verReplantear() {
    const todas = await DB.getTareasPorReplantear();
    if (!todas.length) { Utils.toast('No hay tareas por replantear', 'success'); return; }

    const items = await Promise.all(todas.map(async t => {
      let sub = '', proy = '';
      if (t.subproyectoId) {
        const s = await DB.getById(DB.S.SP, t.subproyectoId);
        if (s) {
          sub = s.nombre;
          if (s.proyectoId) {
            const p = await DB.getById(DB.S.P, s.proyectoId);
            if (p) proy = p.nombre;
          }
        }
      }
      return { t, sub, proy };
    }));

    const rows = items.map(({t, sub, proy}) => `
      <div class="replantear-item" data-id="${t.id}">
        <div class="replantear-item__nombre">${Utils.escape(t.nombre)}</div>
        <div class="replantear-item__meta">${Utils.escape(proy)}${sub ? ' › '+Utils.escape(sub) : ''}</div>
        <div class="replantear-item__acciones">
          <button class="btn btn--sm btn--outline" onclick="Views.Hoy._reagendar('${t.id}')">Reagendar</button>
          <button class="btn btn--sm btn--ghost" onclick="Views.Hoy._archivar('${t.id}')">Archivar</button>
        </div>
      </div>
    `).join('');

    Utils.modal(`
      <div class="modal-form">
        <h2 class="modal-form__title">Por replantear (${todas.length})</h2>
        <div class="opciones-replantear">${rows}</div>
        <div class="modal-form__actions">
          <button class="btn btn--ghost" onclick="Utils.closeModal()">Cerrar</button>
        </div>
      </div>
    `);
  }

  async function _reagendar(tareaId) {
    const t = await DB.getById(DB.S.T, tareaId);
    if (!t) return;
    Utils.modal(`
      <div class="modal-form">
        <h2 class="modal-form__title">Reagendar</h2>
        <p class="modal-form__subtitle">${Utils.escape(t.nombre)}</p>
        <div class="form-group">
          <label class="form-label">Nueva fecha</label>
          <input id="rag-fecha" type="date" class="form-input" value="${Utils.hoy()}">
        </div>
        <div id="rag-conflictos"></div>
        <div class="modal-form__actions">
          <button class="btn btn--ghost" onclick="Views.Hoy._cancelReagendar()">Cancelar</button>
          <button class="btn btn--primary" id="rag-ok">Reagendar</button>
        </div>
      </div>
    `);
    document.getElementById('rag-fecha').addEventListener('change', async (e) => {
      const conflictos = await Capacidad.verificarConflictosFecha(e.target.value);
      const c = document.getElementById('rag-conflictos');
      c.innerHTML = conflictos.map(c => `<div class="alert alert--${c.tipo === 'error' ? 'danger' : c.tipo === 'aviso' ? 'warning' : 'neutral'}">${Utils.escape(c.msg)}</div>`).join('');
    });
    document.getElementById('rag-ok').onclick = async () => {
      const fecha = document.getElementById('rag-fecha').value;
      if (!fecha) { Utils.toast('Indica una fecha', 'warning'); return; }
      await DB.put(DB.S.T, { ...t, estado: 'agendada', fechaAgendada: fecha });
      Utils.closeModal();
      Utils.emit('data-changed', { store: DB.S.T });
      Utils.toast('Tarea reagendada', 'success');
    };
  }

  function _cancelReagendar() {
    Utils.closeModal();
    setTimeout(() => verReplantear(), 50);
  }

  async function _archivar(tareaId) {
    const ok = await Utils.confirm('¿Archivar esta tarea? No aparecerá más en la bandeja.');
    if (!ok) return;
    const t = await DB.getById(DB.S.T, tareaId);
    await DB.put(DB.S.T, { ...t, estado: 'hecha', tiempoReal: 0 });
    Utils.emit('data-changed', { store: DB.S.T });
    Utils.toast('Tarea archivada', 'info');
    setTimeout(() => verReplantear(), 50);
  }

  /* ── Cierre del día ─────────────────────────────────── */
  async function cierreDia() {
    const hoy = Utils.hoy();
    const tareasHoy = await DB.getTareasParaHoy(hoy);
    const pendientes = tareasHoy.filter(t => !['hecha','esperando'].includes(t.estado));

    Utils.modal(`
      <div class="modal-form">
        <h2 class="modal-form__title">Cierre del día</h2>
        ${pendientes.length
          ? `<p class="alert alert--warning">${pendientes.length} tarea(s) sin cerrar pasarán a "Por replantear"</p>`
          : '<p class="alert alert--success">¡Todas las tareas del día están cerradas!</p>'
        }
        <div class="cierre-lista">
          ${pendientes.map(t => `<div class="cierre-item">${Utils.escape(t.nombre)}</div>`).join('')}
        </div>
        <div class="modal-form__actions">
          <button class="btn btn--ghost" id="cierre-cancel">Cancelar</button>
          <button class="btn btn--primary" id="cierre-ok">Confirmar cierre</button>
        </div>
      </div>
    `);
    document.getElementById('cierre-cancel').onclick = () => Utils.closeModal();
    document.getElementById('cierre-ok').onclick = async () => {
      for (const t of pendientes) {
        await DB.put(DB.S.T, { ...t, estado: 'por_replantear', fechaAgendada: null });
      }
      await DB.put(DB.S.M, {
        fecha: hoy,
        tipo: 'cierre_dia',
        pendientesMovidas: pendientes.length
      });
      Utils.closeModal();
      Utils.emit('data-changed', { store: DB.S.T });
      Utils.toast('Día cerrado correctamente', 'success');
    };
  }

  /* ── Render ─────────────────────────────────────────── */
  async function render(container) {
    const hoy = Utils.hoy();
    const [bloques, tareasHoy, porReplantear, esperandosVencidos] = await Promise.all([
      Capacidad.getBloques(),
      DB.getTareasParaHoy(hoy),
      DB.getTareasPorReplantear(),
      DB.getEsperandosVencidos()
    ]);

    const alertas = [];
    if (porReplantear.length)
      alertas.push(`<div class="alert alert--warning" style="cursor:pointer" onclick="Views.Hoy.verReplantear()">
        ${porReplantear.length} tarea(s) por replantear →</div>`);
    if (esperandosVencidos.length)
      alertas.push(`<div class="alert alert--warning">
        ${esperandosVencidos.length} espera(s) vencida(s) — ¿Llegó la respuesta?</div>`);

    // Group tasks by bloque
    const tareasPorBloque = {};
    tareasHoy.forEach(t => {
      const key = t.bloqueAsignado || '_sin_bloque';
      (tareasPorBloque[key] || (tareasPorBloque[key] = [])).push(t);
    });

    const bloqueHtml = bloques.map(b => {
      const ts = tareasPorBloque[b.id] || [];
      const esActivo = _bloqueActivo(b);
      return `
        <div class="bloque bloque--${b.tipo}${esActivo ? ' bloque--activo' : ''}">
          <div class="bloque__header">
            <span class="bloque__nombre">${Utils.escape(b.nombre)}</span>
            <span class="bloque__horario">${b.inicio}–${b.fin}</span>
          </div>
          ${ts.map(t => _renderTarea(t)).join('')}
          ${ts.length === 0 && ['produccion_alta','produccion_media','coordinacion','comprobacion'].includes(b.tipo)
            ? `<div class="bloque__empty">Sin tareas asignadas</div>` : ''}
        </div>
      `;
    }).join('');

    const sinBloque = tareasPorBloque['_sin_bloque'] || [];

    container.innerHTML = `
      <div class="view-hoy">
        <div class="hoy__header">
          <h1 class="hoy__fecha">${Utils.formatFecha(hoy, {largo:true})}</h1>
        </div>
        <div class="hoy__alertas">${alertas.join('')}</div>
        <div class="hoy__bloques">${bloqueHtml}</div>
        ${sinBloque.length ? `
          <div class="hoy__sin-bloque">
            <h3 class="hoy__section-title">Sin bloque asignado</h3>
            ${sinBloque.map(t => _renderTarea(t)).join('')}
          </div>
        ` : ''}
        <div class="hoy__footer">
          <button class="btn btn--outline btn--sm" onclick="Views.Hoy.entróUrgenteNuevo()">+ Urgente</button>
          <button class="btn btn--danger btn--sm" onclick="Views.Hoy.cierreDia()">Cierre del día</button>
        </div>
      </div>
    `;

    // Restore timer display if active
    if (_timerTareaId) {
      const el = document.getElementById('timer-display-' + _timerTareaId);
      if (el) el.textContent = Utils.formatTiempo(_timerSeg);
    }
  }

  function _bloqueActivo(bloque) {
    const ahora = Utils.ahora();
    return ahora >= bloque.inicio && ahora < bloque.fin;
  }

  function _renderTarea(t) {
    const isTimerRunning = _timerTareaId === t.id && _timerStart;
    const isEnCurso = t.estado === 'en_curso';
    const isEsperando = t.estado === 'esperando';

    const acciones = _accionesParaEstado(t, isTimerRunning);

    return `
      <div class="bloque__tarea tarea-estado--${t.estado}" id="tarea-${t.id}">
        <div class="tarea__top">
          <span class="estado-chip estado-chip--${t.estado}">${Utils.labelEstado(t.estado)}</span>
          <span class="tarea__nombre">${Utils.escape(t.nombre)}</span>
        </div>
        ${t.primerPaso ? `<div class="bloque__primer-paso">→ ${Utils.escape(t.primerPaso)}</div>` : ''}
        ${t.terminadoCuando ? `<div class="bloque__terminado-cuando">✓ ${Utils.escape(t.terminadoCuando)}</div>` : ''}
        ${isEsperando ? `<div class="bloque__esperando">⏳ Esperando a ${Utils.escape(t.esperandoA||'')}${t.esperandoHasta ? ' hasta ' + Utils.formatFecha(t.esperandoHasta, {corto:true}) : ''}</div>` : ''}
        ${isEnCurso || isTimerRunning ? `<div class="bloque__timer"><span id="timer-display-${t.id}">${Utils.formatTiempo(_timerSeg)}</span></div>` : ''}
        <div class="tarea__acciones">${acciones}</div>
      </div>
    `;
  }

  function _accionesParaEstado(t, isTimerRunning) {
    const id = t.id;
    switch(t.estado) {
      case 'por_hacer':
      case 'agendada':
        return `
          <button class="btn btn--sm btn--primary" onclick="Views.Hoy.empezarTarea('${id}')">▶ Empezar</button>
          <button class="btn btn--sm btn--ghost" onclick="Views.Hoy.marcarEsperando('${id}')">⏳ Esperar</button>
          <button class="btn btn--sm btn--ghost" onclick="Views.Hoy.noEmpece('${id}')">No empecé</button>
        `;
      case 'en_curso':
        return `
          <button class="btn btn--sm btn--success" onclick="Views.Hoy.cerrarTarea('${id}')">✓ Cerrar</button>
          ${isTimerRunning
            ? `<button class="btn btn--sm btn--ghost" onclick="Views.Hoy.pausarTarea('${id}')">⏸ Pausar</button>`
            : `<button class="btn btn--sm btn--primary" onclick="Views.Hoy.empezarTarea('${id}')">▶ Reanudar</button>`}
          <button class="btn btn--sm btn--ghost" onclick="Views.Hoy.marcarEsperando('${id}')">⏳ Esperar</button>
        `;
      case 'esperando':
        return `
          <button class="btn btn--sm btn--primary" onclick="Views.Hoy.llegóRespuesta('${id}')">✓ Llegó respuesta</button>
          <button class="btn btn--sm btn--ghost" onclick="Views.Hoy.marcarEsperando('${id}')">Editar espera</button>
        `;
      case 'por_replantear':
        return `
          <button class="btn btn--sm btn--outline" onclick="Views.Hoy._reagendar('${id}')">Reagendar</button>
          <button class="btn btn--sm btn--ghost" onclick="Views.Hoy._archivar('${id}')">Archivar</button>
        `;
      default:
        return '';
    }
  }

  async function entróUrgenteNuevo() {
    // Open new task form pre-filled for today
    const opts = { fechaAgendada: Utils.hoy(), onSave: () => Utils.emit('data-changed', { store: DB.S.T }) };
    Views.Forms.nuevaTarea(opts);
  }

  function init() {
    _loadTimer();
    Utils.on('data-changed', () => {
      const container = document.getElementById('main');
      if (container && document.location.hash === '#hoy') render(container);
    });
  }

  window.Views = window.Views || {};
  window.Views.Hoy = {
    render, init,
    empezarTarea, pausarTarea, cerrarTarea, noEmpece,
    marcarEsperando, llegóRespuesta, entróUrgente,
    replantearTarea, verReplantear, cierreDia,
    entróUrgenteNuevo,
    _toggleNoEmpece, _reagendar, _cancelReagendar, _archivar
  };

})(window);
