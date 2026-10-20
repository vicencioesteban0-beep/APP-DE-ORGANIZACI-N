(function(window) {
  'use strict';

  let _offsetSemanas = 0;

  function _fechasSemana() {
    if (_offsetSemanas === 0) return Utils.semanaActual();
    const hoy = Utils.hoy();
    const semana = Utils.semanaActual();
    const lunes = semana[1]; // index 1 = Monday
    const nuevoLunes = Utils.addDiasHabiles(lunes, _offsetSemanas * 5);
    return Utils.semanaDesde(nuevoLunes);
  }

  async function render(container) {
    const fechas = _fechasSemana();
    const diasHabiles = fechas.filter(f => Utils.esDiaHabil(f));
    const hoy = Utils.hoy();

    const [holgura, tareasTodas] = await Promise.all([
      Capacidad.getHolguraSemana(diasHabiles),
      DB.getAll(DB.S.T)
    ]);

    const { cap, carga, pct, semaforo } = holgura;

    const labels = { produccion: 'Producción', coordinacion: 'Coordinación', comprobacion: 'Comprobación' };

    const barrasHtml = ['produccion','coordinacion','comprobacion'].map(tipo => {
      const capVal  = cap[tipo]  || 0;
      const cargaVal= carga[tipo]|| 0;
      const pctTipo = capVal > 0 ? Math.min(100, Math.round((cargaVal/capVal)*100)) : 0;
      const color   = pctTipo > 100 ? 'var(--c-danger)' : pctTipo > 85 ? 'var(--c-warn)' : 'var(--c-primary)';
      return `
        <div class="semana__barra-item">
          <span class="semana__barra-label">${labels[tipo]}</span>
          <div class="semana__barra-track">
            <div class="semana__barra-fill" style="width:${Math.min(pctTipo,100)}%;background:${color}"></div>
          </div>
          <span class="semana__barra-nums">${Utils.formatHoras(cargaVal)} / ${Utils.formatHoras(capVal)}</span>
        </div>
      `;
    }).join('');

    const diasHtml = diasHabiles.map(f => {
      const tareasDia = tareasTodas.filter(t => t.fechaAgendada === f && t.estado !== 'hecha');
      const esHoy = f === hoy;
      return `
        <div class="semana__dia${esHoy ? ' semana__dia--hoy' : ''}">
          <div class="semana__dia-header">
            <span class="semana__dia-label">${Utils.formatFecha(f, {semana:true})}</span>
            <span class="semana__dia-count">${tareasDia.length} tarea${tareasDia.length !== 1 ? 's':''}</span>
          </div>
          <div class="semana__dia-tareas">
            ${tareasDia.length === 0
              ? '<div class="semana__dia-empty">Libre</div>'
              : tareasDia.map(t => _renderTareaCompacta(t, f)).join('')}
          </div>
          <button class="btn btn--ghost btn--sm semana__add-btn" onclick="Views.Semana._nuevaTareaEnDia('${f}')">+ Tarea</button>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div class="view-semana">
        <div class="semana__nav">
          <button class="btn btn--ghost btn--sm" onclick="Views.Semana._navSemana(-1)">← Anterior</button>
          <span class="semana__titulo">
            ${_offsetSemanas === 0 ? 'Esta semana' : _offsetSemanas > 0 ? `+${_offsetSemanas} semana${_offsetSemanas>1?'s':''}` : `${_offsetSemanas} semana${_offsetSemanas<-1?'s':''}`}
          </span>
          <button class="btn btn--ghost btn--sm" onclick="Views.Semana._navSemana(1)">Siguiente →</button>
          ${_offsetSemanas !== 0 ? `<button class="btn btn--ghost btn--sm" onclick="Views.Semana._irHoy()">Hoy</button>` : ''}
        </div>

        <div class="semana__holgura">
          <div class="semana__holgura-semaforo semaforo semaforo--${semaforo}"></div>
          <span class="semana__holgura-texto">
            Holgura: ${Utils.formatHoras(holgura.holgura)} (${pct}%)
            — ${semaforo === 'verde' ? 'Semana manejable' : semaforo === 'ambar' ? 'Semana cargada' : '¡Semana sobrecargada!'}
          </span>
        </div>

        <div class="semana__barras">${barrasHtml}</div>
        <div class="semana__dias">${diasHtml}</div>
      </div>
    `;
  }

  function _renderTareaCompacta(t, fecha) {
    return `
      <div class="semana__tarea semana__tarea--${t.estado}" onclick="Views.Semana._verTarea('${t.id}')">
        <span class="semana__tarea-nombre">${Utils.escape(Utils.truncate(t.nombre, 45))}</span>
        <span class="semana__tarea-meta">
          ${Utils.formatHoras(t.estimadoBase)}
          ${t.estado === 'esperando' ? '⏳' : ''}
        </span>
      </div>
    `;
  }

  async function _verTarea(tareaId) {
    const t = await DB.getById(DB.S.T, tareaId);
    if (!t) return;
    Views.Forms.nuevaTarea({ id: tareaId });
  }

  function _nuevaTareaEnDia(fecha) {
    Views.Forms.nuevaTarea({ fechaAgendada: fecha });
  }

  function _navSemana(dir) {
    _offsetSemanas += dir;
    Utils.emit('nav', { view: 'semana' });
  }

  function _irHoy() {
    _offsetSemanas = 0;
    Utils.emit('nav', { view: 'semana' });
  }

  window.Views = window.Views || {};
  window.Views.Semana = { render, _navSemana, _irHoy, _verTarea, _nuevaTareaEnDia };

})(window);
