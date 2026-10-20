(function(window) {
  'use strict';

  async function render(container, subproyectoId) {
    const [sub, tareas, colaboradores, proyectos] = await Promise.all([
      DB.getById(DB.S.SP, subproyectoId),
      DB.getByIndex(DB.S.T, 'subproyectoId', subproyectoId),
      DB.getAll(DB.S.C),
      DB.getAll(DB.S.P)
    ]);

    if (!sub) {
      container.innerHTML = '<div class="empty-state"><p>Subproyecto no encontrado</p></div>';
      return;
    }

    const colabMap = Object.fromEntries(colaboradores.map(c => [c.id, c]));
    const proy = proyectos.find(p => p.id === sub.proyectoId);
    const colab = sub.colaboradorId ? colabMap[sub.colaboradorId] : null;
    const avance = await Capacidad.calcAvancePonderado(subproyectoId);

    // Group tareas by estado
    const estados = ['en_curso', 'agendada', 'por_hacer', 'esperando', 'por_replantear', 'hecha'];
    const grupos = {};
    estados.forEach(e => { grupos[e] = []; });
    tareas.forEach(t => { (grupos[t.estado] || (grupos['por_hacer'] = grupos['por_hacer'] || [])).push(t); });

    // Pipeline etapas
    const etapas = ['produccion','espera','ajustes','colchon','listo'];
    const etapaActual = sub.etapa || 'produccion';
    const pipelineHtml = etapas.map(e => `
      <div class="pipeline__etapa${e === etapaActual ? ' pipeline__etapa--activa' : ''}" onclick="Views.Subproyecto._cambiarEtapa('${subproyectoId}', '${e}')">
        ${Utils.labelEtapa(e)}
      </div>
    `).join('<div class="pipeline__sep">→</div>');

    const horas = tareas.reduce((s,t) => s + (t.estimadoBase||0), 0);
    const horasHechas = tareas.filter(t => t.estado==='hecha').reduce((s,t) => s + (t.estimadoBase||0), 0);

    container.innerHTML = `
      <div class="view-subproyecto">
        <div class="view-subproyecto__back">
          <button class="btn btn--ghost btn--sm" onclick="window.history.back()">
            ← ${proy ? Utils.escape(proy.nombre) : 'Proyecto'}
          </button>
        </div>

        <div class="view-subproyecto__header">
          <div>
            <h1>${Utils.escape(sub.nombre)}</h1>
            ${colab ? `<div class="view-subproyecto__colab">👤 ${Utils.escape(colab.nombre)}</div>` : ''}
          </div>
          <div class="view-subproyecto__header-acciones">
            <button class="btn btn--ghost btn--sm" onclick="Views.Forms.nuevoSubproyecto({id:'${sub.id}'})">Editar</button>
            <button class="btn btn--primary btn--sm" onclick="Views.Forms.nuevaTarea({subproyectoId:'${sub.id}'})">+ Tarea</button>
          </div>
        </div>

        <div class="pipeline">${pipelineHtml}</div>

        <div class="view-subproyecto__resumen">
          <div class="view-subproyecto__stat">
            <span>Avance:</span>
            <div class="progress-bar">
              <div class="progress-bar__fill" style="width:${avance}%"></div>
            </div>
            <span>${avance}%</span>
          </div>
          <div class="view-subproyecto__stat">
            <span>Horas: ${Utils.formatHoras(horasHechas)} / ${Utils.formatHoras(horas)}</span>
          </div>
          ${sub.fechaInicio ? `<div class="view-subproyecto__stat"><span>Ventana: ${Utils.formatFecha(sub.fechaInicio, {corto:true})} – ${sub.fechaFin ? Utils.formatFecha(sub.fechaFin, {corto:true}) : '?'}</span></div>` : ''}
          ${sub.siguienteAccion ? `<div class="alert alert--neutral"><strong>Siguiente acción:</strong> ${Utils.escape(sub.siguienteAccion)}</div>` : ''}
        </div>

        <div class="view-subproyecto__tareas">
          ${_seccionTareas('En curso', grupos['en_curso'], true)}
          ${_seccionTareas('Por hacer / Agendadas', [...grupos['por_hacer'], ...grupos['agendada']])}
          ${_seccionTareas('Esperando', grupos['esperando'])}
          ${grupos['por_replantear'].length ? _seccionTareas('Por replantear', grupos['por_replantear']) : ''}
          <details class="lista-tareas__hechas">
            <summary>Hechas (${grupos['hecha'].length})</summary>
            ${_seccionTareas('', grupos['hecha'])}
          </details>
        </div>
      </div>
    `;
  }

  function _seccionTareas(titulo, tareas, destacado) {
    if (!tareas.length) return '';
    return `
      <div class="lista-tareas${destacado ? ' lista-tareas--destacada' : ''}">
        ${titulo ? `<h3 class="lista-tareas__titulo">${titulo}</h3>` : ''}
        ${tareas.map(t => _renderTareaRow(t)).join('')}
      </div>
    `;
  }

  function _renderTareaRow(t) {
    return `
      <div class="tarea-row tarea-row--${t.estado}" onclick="Views.Forms.nuevaTarea({id:'${t.id}'})">
        <div class="tarea-row__left">
          <span class="estado-chip estado-chip--${t.estado}">${Utils.labelEstado(t.estado)}</span>
          <span class="tarea-row__nombre">${Utils.escape(t.nombre)}</span>
        </div>
        <div class="tarea-row__right">
          ${t.estado === 'esperando' && t.esperandoA ? `<span class="tarea-row__espera">⏳ ${Utils.escape(t.esperandoA)}</span>` : ''}
          <span class="tarea-row__tiempo">${Utils.formatHoras(t.estimadoBase)}</span>
          ${t.fechaAgendada ? `<span class="tarea-row__fecha">${Utils.formatFecha(t.fechaAgendada, {corto:true})}</span>` : ''}
          <button class="btn btn--icon" title="Agenda" onclick="event.stopPropagation(); Views.Subproyecto._agendarTarea('${t.id}')">📅</button>
        </div>
      </div>
    `;
  }

  async function _agendarTarea(tareaId) {
    const t = await DB.getById(DB.S.T, tareaId);
    if (!t) return;
    Utils.modal(`
      <div class="modal-form">
        <h2 class="modal-form__title">Agendar tarea</h2>
        <p class="modal-form__subtitle">${Utils.escape(t.nombre)}</p>
        <div class="form-group">
          <label class="form-label">Fecha</label>
          <input id="ag-fecha" type="date" class="form-input" value="${t.fechaAgendada || Utils.hoy()}">
        </div>
        <div id="ag-conflictos"></div>
        <div class="modal-form__actions">
          <button class="btn btn--ghost" id="ag-cancel">Cancelar</button>
          <button class="btn btn--primary" id="ag-ok">Agendar</button>
        </div>
      </div>
    `);
    document.getElementById('ag-fecha').addEventListener('change', async (e) => {
      const conflictos = await Capacidad.verificarConflictosFecha(e.target.value);
      document.getElementById('ag-conflictos').innerHTML = conflictos
        .map(c => `<div class="alert alert--${c.tipo === 'error' ? 'danger' : 'warning'}">${Utils.escape(c.msg)}</div>`)
        .join('');
    });
    document.getElementById('ag-cancel').onclick = () => Utils.closeModal();
    document.getElementById('ag-ok').onclick = async () => {
      const fecha = document.getElementById('ag-fecha').value;
      if (!fecha) { Utils.toast('Indica una fecha', 'warning'); return; }
      await DB.put(DB.S.T, { ...t, fechaAgendada: fecha, estado: 'agendada' });
      Utils.closeModal();
      Utils.emit('data-changed', { store: DB.S.T });
      Utils.toast('Tarea agendada', 'success');
    };
  }

  async function _cambiarEtapa(subproyectoId, etapa) {
    const sub = await DB.getById(DB.S.SP, subproyectoId);
    if (!sub) return;
    await DB.put(DB.S.SP, { ...sub, etapa });
    Utils.emit('data-changed', { store: DB.S.SP });
    Utils.toast('Etapa actualizada: ' + Utils.labelEtapa(etapa), 'success');
  }

  window.Views = window.Views || {};
  window.Views.Subproyecto = { render, _agendarTarea, _cambiarEtapa };

})(window);
