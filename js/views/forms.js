(function(window) {
  'use strict';

  /* ── Proyecto ──────────────────────────────────────────── */
  async function nuevoProyecto(opts = {}) {
    const edit = opts.id ? await DB.getById(DB.S.P, opts.id) : null;
    const html = `
      <div class="modal-form">
        <h2 class="modal-form__title">${edit ? 'Editar proyecto' : 'Nuevo proyecto'}</h2>
        <div class="form-group">
          <label class="form-label">Nombre <span class="required">*</span></label>
          <input id="fp-nombre" class="form-input" type="text" placeholder="Ej: Bimestre 5 – 2026"
            value="${Utils.escape(edit?.nombre||'')}">
        </div>
        <div class="form-group">
          <label class="form-label">Fecha de entrega <span class="required">*</span></label>
          <input id="fp-entrega" class="form-input" type="date"
            value="${edit?.fechaEntrega||''}">
        </div>
        <div class="form-group">
          <label class="form-label">Descripción</label>
          <textarea id="fp-desc" class="form-input form-textarea"
            placeholder="Notas sobre el proyecto...">${Utils.escape(edit?.descripcion||'')}</textarea>
        </div>
        <div class="form-actions">
          <button class="btn btn--ghost" onclick="Utils.closeModal()">Cancelar</button>
          ${edit ? `<button class="btn btn--danger btn--sm" onclick="Views.Forms._eliminarProyecto('${edit.id}')">Eliminar</button>` : ''}
          <button class="btn btn--primary" onclick="Views.Forms._guardarProyecto('${edit?.id||''}')">Guardar</button>
        </div>
      </div>`;
    Utils.modal(html);
  }

  async function _guardarProyecto(id) {
    const nombre  = document.getElementById('fp-nombre').value.trim();
    const entrega = document.getElementById('fp-entrega').value;
    const desc    = document.getElementById('fp-desc').value.trim();
    if (!nombre || !entrega) { Utils.toast('Nombre y fecha de entrega son obligatorios','danger'); return; }
    await DB.put(DB.S.P, { id: id||undefined, nombre, fechaEntrega: entrega, descripcion: desc, estado:'activo' });
    Utils.closeModal();
    Utils.toast(id ? 'Proyecto actualizado' : 'Proyecto creado', 'success');
    Utils.emit('data-changed', { store: DB.S.P });
  }

  async function _eliminarProyecto(id) {
    const ok = await Utils.confirm('¿Eliminar este proyecto y todos sus subproyectos y tareas?');
    if (!ok) return;
    const subs = await DB.getByIndex(DB.S.SP, 'proyectoId', id);
    for (const s of subs) {
      const ts = await DB.getByIndex(DB.S.T, 'subproyectoId', s.id);
      for (const t of ts) await DB.remove(DB.S.T, t.id);
      await DB.remove(DB.S.SP, s.id);
    }
    await DB.remove(DB.S.P, id);
    Utils.closeModal();
    Utils.toast('Proyecto eliminado', 'info');
    Utils.emit('data-changed', { store: DB.S.P });
    App.navigate('portafolio');
  }

  /* ── Subproyecto ───────────────────────────────────────── */
  async function nuevoSubproyecto(opts = {}) {
    const edit = opts.id ? await DB.getById(DB.S.SP, opts.id) : null;
    const proyectos = await DB.getAll(DB.S.P);
    const colabs    = await DB.getAll(DB.S.C);
    const lotes     = await DB.getAll(DB.S.L);

    const defaultInicio = edit?.ventanaInicio || Utils.hoy();
    const defaultFin    = edit?.ventanaFin    || Utils.addDiasHabiles(Utils.hoy(), 20);

    const html = `
      <div class="modal-form">
        <h2 class="modal-form__title">${edit ? 'Editar subproyecto' : 'Nuevo subproyecto'}</h2>
        <div class="form-group">
          <label class="form-label">Proyecto <span class="required">*</span></label>
          <select id="fsp-proyecto" class="form-input form-select">
            ${proyectos.map(p => `<option value="${p.id}" ${(edit?.proyectoId||opts.proyectoId)===p.id?'selected':''}>
              ${Utils.escape(p.nombre)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Nombre <span class="required">*</span></label>
          <input id="fsp-nombre" class="form-input" type="text" placeholder="Ej: Asignatura – Nombre del docente"
            value="${Utils.escape(edit?.nombre||'')}">
        </div>
        <div class="form-group">
          <label class="form-label">Tipo</label>
          <div class="toggle-group" id="fsp-tipo">
            ${['elaboracion','replica','reutilizar','coordinacion_simple'].map(t =>
              `<button class="toggle-btn ${(edit?.tipo||'elaboracion')===t?'active':''}" data-val="${t}"
                onclick="Views.Forms._toggleSelect(this,'fsp-tipo')">${Plantillas.getLabel(t)}</button>`
            ).join('')}
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Colaborador externo</label>
          <select id="fsp-colab" class="form-input form-select">
            <option value="">— Ninguno —</option>
            ${colabs.map(c => `<option value="${c.id}" ${edit?.colaboradorId===c.id?'selected':''}>${Utils.escape(c.nombre)}</option>`).join('')}
          </select>
          <button class="btn btn--ghost btn--sm" style="margin-top:4px" onclick="Views.Forms.nuevoColaborador()">+ Nuevo colaborador</button>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="form-group">
            <label class="form-label">Ventana inicio</label>
            <input id="fsp-inicio" class="form-input" type="date" value="${defaultInicio}">
          </div>
          <div class="form-group">
            <label class="form-label">Ventana fin (máx 20 d.h.)</label>
            <input id="fsp-fin" class="form-input" type="date" value="${defaultFin}">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Etapa actual</label>
          <div class="toggle-group" id="fsp-etapa">
            ${['produccion','espera','ajustes','colchon','listo'].map(e =>
              `<button class="toggle-btn ${(edit?.etapa||'produccion')===e?'active':''}" data-val="${e}"
                onclick="Views.Forms._toggleSelect(this,'fsp-etapa')">${Utils.labelEtapa(e)}</button>`
            ).join('')}
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Siguiente acción única</label>
          <input id="fsp-siguiente" class="form-input" type="text"
            placeholder="La única cosa que desbloquea el avance de este subproyecto ahora"
            value="${Utils.escape(edit?.siguienteAccion||'')}">
        </div>
        ${!edit ? `
        <div class="form-group">
          <label class="checkbox-label">
            <input type="checkbox" id="fsp-plantilla" checked>
            Crear tareas desde plantilla automáticamente
          </label>
        </div>` : ''}
        <div class="form-actions">
          <button class="btn btn--ghost" onclick="Utils.closeModal()">Cancelar</button>
          ${edit ? `<button class="btn btn--danger btn--sm" onclick="Views.Forms._eliminarSubproyecto('${edit.id}')">Eliminar</button>` : ''}
          <button class="btn btn--primary" onclick="Views.Forms._guardarSubproyecto('${edit?.id||''}')">Guardar</button>
        </div>
      </div>`;
    Utils.modal(html);
  }

  function _toggleSelect(btn, groupId) {
    document.querySelectorAll(`#${groupId} .toggle-btn`).forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }

  function _getToggle(groupId) {
    return document.querySelector(`#${groupId} .toggle-btn.active`)?.dataset.val;
  }

  async function _guardarSubproyecto(id) {
    const nombre    = document.getElementById('fsp-nombre').value.trim();
    const proyId    = document.getElementById('fsp-proyecto').value;
    const tipo      = _getToggle('fsp-tipo') || 'elaboracion';
    const colabId   = document.getElementById('fsp-colab').value || null;
    const inicio    = document.getElementById('fsp-inicio').value;
    const fin       = document.getElementById('fsp-fin').value;
    const etapa     = _getToggle('fsp-etapa') || 'produccion';
    const siguiente = document.getElementById('fsp-siguiente').value.trim();
    const usarPlantilla = document.getElementById('fsp-plantilla')?.checked;

    if (!nombre) { Utils.toast('El nombre es obligatorio','danger'); return; }

    const sp = await DB.put(DB.S.SP, {
      id: id||undefined,
      proyectoId: proyId,
      nombre, tipo,
      colaboradorId: colabId,
      ventanaInicio: inicio,
      ventanaFin: fin,
      etapa,
      siguienteAccion: siguiente,
      estado: 'activo'
    });

    if (!id && usarPlantilla) {
      await Plantillas.crearDesdePlantilla(tipo, sp.id, inicio);
      Utils.toast('Subproyecto creado con tareas desde plantilla','success', 4000);
    } else {
      Utils.toast(id ? 'Subproyecto actualizado' : 'Subproyecto creado', 'success');
    }

    Utils.closeModal();
    Utils.emit('data-changed', { store: DB.S.SP });
    App.navigate('subproyecto', { id: sp.id });
  }

  async function _eliminarSubproyecto(id) {
    const ok = await Utils.confirm('¿Eliminar este subproyecto y todas sus tareas?');
    if (!ok) return;
    const ts = await DB.getByIndex(DB.S.T, 'subproyectoId', id);
    for (const t of ts) await DB.remove(DB.S.T, t.id);
    const sp = await DB.getById(DB.S.SP, id);
    await DB.remove(DB.S.SP, id);
    Utils.closeModal();
    Utils.toast('Subproyecto eliminado','info');
    Utils.emit('data-changed', { store: DB.S.SP });
    App.navigate('proyecto', { id: sp.proyectoId });
  }

  /* ── Tarea ─────────────────────────────────────────────── */
  async function nuevaTarea(opts = {}) {
    const edit = opts.id ? await DB.getById(DB.S.T, opts.id) : null;
    const sps  = await DB.getAll(DB.S.SP);
    const bloques = await Capacidad.getBloques();
    const bloqTrabajo = bloques.filter(b => !['pausa','almuerzo'].includes(b.id));
    const margen = (await DB.getConfig('margenEstimado')) || 1.3;

    const isEsp = edit?.estado === 'esperando';

    const html = `
      <div class="modal-form">
        <h2 class="modal-form__title">${edit ? 'Editar tarea' : 'Nueva tarea'}</h2>

        <div class="form-group">
          <label class="form-label">Subproyecto <span class="required">*</span></label>
          <select id="ft-sp" class="form-input form-select">
            <option value="">— Ninguno (tarea suelta) —</option>
            ${sps.map(s => `<option value="${s.id}" ${(edit?.subproyectoId||opts.subproyectoId)===s.id?'selected':''}>${Utils.escape(s.nombre)}</option>`).join('')}
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Nombre <span class="required">*</span></label>
          <input id="ft-nombre" class="form-input" type="text" placeholder="¿Qué hay que hacer?"
            value="${Utils.escape(edit?.nombre||'')}">
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="form-group">
            <label class="form-label">Tipo de trabajo</label>
            <select id="ft-tipo" class="form-input form-select">
              ${['produccion','coordinacion','comprobacion','planificacion'].map(t =>
                `<option value="${t}" ${edit?.tipoTrabajo===t?'selected':''}>${Utils.labelTipoTrabajo(t)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Demanda cognitiva</label>
            <select id="ft-demanda" class="form-input form-select">
              ${['alta','media','mecanica'].map(d =>
                `<option value="${d}" ${(edit?.demandaCognitiva||'alta')===d?'selected':''}>${Utils.labelDemanda(d)}</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Primer paso ≤10 min <span class="required">*</span></label>
          <input id="ft-paso" class="form-input" type="text"
            placeholder="La acción más pequeña posible para empezar (ej: Abrir el archivo y leer el título)"
            value="${Utils.escape(edit?.primerPaso||'')}">
          <span class="form-hint">Debe poder completarse en 10 minutos o menos</span>
        </div>

        <div class="form-group">
          <label class="form-label">Terminado cuando <span class="required">*</span></label>
          <input id="ft-terminado" class="form-input" type="text"
            placeholder="¿Cómo sabrás que está lista? (ej: El archivo tiene las 3 secciones completas)"
            value="${Utils.escape(edit?.terminadoCuando||'')}">
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="form-group">
            <label class="form-label">Estimado base (horas) <span class="required">*</span></label>
            <input id="ft-estimado" class="form-input" type="number" step="0.25" min="0.1"
              value="${edit?.estimadoBase||1}"
              oninput="Views.Forms._actualizarMargen()">
            <span class="form-hint" id="ft-con-margen">Con margen (×${margen}): ${Utils.formatHoras((edit?.estimadoBase||1)*margen)}</span>
          </div>
          <div class="form-group">
            <label class="form-label">Estado inicial</label>
            <select id="ft-estado" class="form-input form-select">
              ${['por_hacer','agendada','esperando'].map(e =>
                `<option value="${e}" ${(edit?.estado||'por_hacer')===e?'selected':''}>${Utils.labelEstado(e)}</option>`).join('')}
            </select>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="form-group">
            <label class="form-label">Fecha agendada</label>
            <input id="ft-fecha" class="form-input" type="date"
              value="${edit?.fechaAgendada||opts.fechaAgendada||''}">
          </div>
          <div class="form-group">
            <label class="form-label">Bloque</label>
            <select id="ft-bloque" class="form-input form-select">
              <option value="">— Sin asignar —</option>
              ${bloqTrabajo.map(b =>
                `<option value="${b.id}" ${(edit?.bloqueAsignado||opts.bloqueAsignado)===b.id?'selected':''}>${Utils.escape(b.nombre)} (${b.inicio})</option>`).join('')}
            </select>
          </div>
        </div>

        <div id="ft-espera-section" style="${isEsp?'':'display:none'}">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="form-group">
              <label class="form-label">Esperando a</label>
              <input id="ft-esp-a" class="form-input" type="text"
                placeholder="Nombre de la persona o entidad"
                value="${Utils.escape(edit?.esperandoA||'')}">
            </div>
            <div class="form-group">
              <label class="form-label">Fecha límite de respuesta</label>
              <input id="ft-esp-hasta" class="form-input" type="date"
                value="${edit?.esperandoHasta||Utils.addDiasHabiles(Utils.hoy(),4)}">
            </div>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Disparador o dependencia</label>
          <input id="ft-disparador" class="form-input" type="text"
            placeholder="Ej: Cuando llegue la respuesta del docente / Si es viernes revisar carpeta"
            value="${Utils.escape(edit?.disparador||'')}">
        </div>

        <div class="form-actions">
          <button class="btn btn--ghost" onclick="Utils.closeModal()">Cancelar</button>
          ${edit ? `<button class="btn btn--danger btn--sm" onclick="Views.Forms._eliminarTarea('${edit.id}')">Eliminar</button>` : ''}
          <button class="btn btn--primary" onclick="Views.Forms._guardarTarea('${edit?.id||''}')">Guardar</button>
        </div>
      </div>`;
    Utils.modal(html);

    // Show/hide espera section on status change
    document.getElementById('ft-estado')?.addEventListener('change', e => {
      const s = document.getElementById('ft-espera-section');
      if (s) s.style.display = e.target.value === 'esperando' ? '' : 'none';
    });
  }

  function _actualizarMargen() {
    const val = parseFloat(document.getElementById('ft-estimado')?.value) || 0;
    DB.getConfig('margenEstimado').then(m => {
      const margen = m || 1.3;
      const el = document.getElementById('ft-con-margen');
      if (el) el.textContent = `Con margen (×${margen}): ${Utils.formatHoras(val * margen)}`;
    });
  }

  async function _guardarTarea(id) {
    const nombre     = document.getElementById('ft-nombre').value.trim();
    const primerPaso = document.getElementById('ft-paso').value.trim();
    const terminado  = document.getElementById('ft-terminado').value.trim();
    const estimado   = parseFloat(document.getElementById('ft-estimado').value) || 0;

    if (!nombre || !primerPaso || !terminado || !estimado) {
      Utils.toast('Nombre, primer paso, "terminado cuando" y estimado son obligatorios','danger');
      return;
    }

    const margen  = (await DB.getConfig('margenEstimado')) || 1.3;
    const estado  = document.getElementById('ft-estado').value;
    const fecha   = document.getElementById('ft-fecha').value || null;
    const bloque  = document.getElementById('ft-bloque').value || null;

    // Validate fecha
    if (fecha) {
      const conflictos = await Capacidad.verificarConflictosFecha(fecha);
      const error = conflictos.find(c => c.tipo === 'error');
      if (error) {
        const ok = await Utils.confirm(`${error.msg}. ¿Continuar de todas formas?`);
        if (!ok) return;
      }
    }

    const tarea = {
      id: id || undefined,
      subproyectoId:   document.getElementById('ft-sp').value || null,
      nombre,
      tipoTrabajo:     document.getElementById('ft-tipo').value,
      demandaCognitiva:document.getElementById('ft-demanda').value,
      primerPaso,
      terminadoCuando: terminado,
      estimadoBase:    estimado,
      estimadoConMargen: Math.round(estimado * margen * 100)/100,
      estado,
      fechaAgendada:   fecha,
      bloqueAsignado:  bloque,
      esperandoA:      estado === 'esperando' ? document.getElementById('ft-esp-a').value.trim() : null,
      esperandoHasta:  estado === 'esperando' ? document.getElementById('ft-esp-hasta').value : null,
      disparador:      document.getElementById('ft-disparador').value.trim() || null,
    };

    await DB.put(DB.S.T, tarea);
    Utils.closeModal();
    Utils.toast(id ? 'Tarea actualizada' : 'Tarea creada', 'success');
    Utils.emit('data-changed', { store: DB.S.T });
  }

  async function _eliminarTarea(id) {
    const ok = await Utils.confirm('¿Eliminar esta tarea?');
    if (!ok) return;
    await DB.remove(DB.S.T, id);
    Utils.closeModal();
    Utils.toast('Tarea eliminada','info');
    Utils.emit('data-changed', { store: DB.S.T });
  }

  /* ── Colaborador ───────────────────────────────────────── */
  async function nuevoColaborador(opts = {}) {
    const edit = opts.id ? await DB.getById(DB.S.C, opts.id) : null;
    const html = `
      <div class="modal-form">
        <h2 class="modal-form__title">${edit ? 'Editar colaborador' : 'Nuevo colaborador'}</h2>
        <div class="form-group">
          <label class="form-label">Nombre <span class="required">*</span></label>
          <input id="fc-nombre" class="form-input" type="text"
            value="${Utils.escape(edit?.nombre||'')}">
        </div>
        <div class="form-group">
          <label class="form-label">Email</label>
          <input id="fc-email" class="form-input" type="email"
            value="${Utils.escape(edit?.email||'')}">
        </div>
        <div class="form-group">
          <label class="form-label">Nota</label>
          <input id="fc-nota" class="form-input" type="text"
            placeholder="Rol, departamento, notas de contacto..."
            value="${Utils.escape(edit?.nota||'')}">
        </div>
        <div class="form-actions">
          <button class="btn btn--ghost" onclick="Utils.closeModal()">Cancelar</button>
          <button class="btn btn--primary" onclick="Views.Forms._guardarColaborador('${edit?.id||''}')">Guardar</button>
        </div>
      </div>`;
    Utils.modal(html);
  }

  async function _guardarColaborador(id) {
    const nombre = document.getElementById('fc-nombre').value.trim();
    if (!nombre) { Utils.toast('El nombre es obligatorio','danger'); return; }
    const c = await DB.put(DB.S.C, {
      id: id||undefined,
      nombre,
      email: document.getElementById('fc-email').value.trim(),
      nota:  document.getElementById('fc-nota').value.trim(),
      ultimoContacto: Utils.hoy()
    });
    Utils.closeModal();
    Utils.toast('Colaborador guardado','success');
    Utils.emit('data-changed', { store: DB.S.C });
    return c;
  }

  /* ── Lote de entrega ───────────────────────────────────── */
  async function nuevoLote(opts = {}) {
    const edit = opts.id ? await DB.getById(DB.S.L, opts.id) : null;
    const sps  = await DB.getAll(DB.S.SP);
    const html = `
      <div class="modal-form">
        <h2 class="modal-form__title">${edit ? 'Editar lote' : 'Nuevo lote de entrega'}</h2>
        <div class="form-group">
          <label class="form-label">Nombre del lote <span class="required">*</span></label>
          <input id="fl-nombre" class="form-input" type="text"
            placeholder="Ej: Hito semanal 3 – nov"
            value="${Utils.escape(edit?.nombre||'')}">
        </div>
        <div class="form-group">
          <label class="form-label">Fecha de cierre <span class="required">*</span></label>
          <input id="fl-fecha" class="form-input" type="date" value="${edit?.fecha||''}">
        </div>
        <div class="form-actions">
          <button class="btn btn--ghost" onclick="Utils.closeModal()">Cancelar</button>
          <button class="btn btn--primary" onclick="Views.Forms._guardarLote('${edit?.id||''}')">Guardar</button>
        </div>
      </div>`;
    Utils.modal(html);
  }

  async function _guardarLote(id) {
    const nombre = document.getElementById('fl-nombre').value.trim();
    const fecha  = document.getElementById('fl-fecha').value;
    if (!nombre || !fecha) { Utils.toast('Nombre y fecha son obligatorios','danger'); return; }
    await DB.put(DB.S.L, { id: id||undefined, nombre, fecha });
    Utils.closeModal();
    Utils.toast('Lote guardado','success');
    Utils.emit('data-changed', { store: DB.S.L });
  }

  window.Views = window.Views || {};
  window.Views.Forms = {
    nuevoProyecto, _guardarProyecto, _eliminarProyecto,
    nuevoSubproyecto, _guardarSubproyecto, _eliminarSubproyecto, _toggleSelect, _getToggle,
    nuevaTarea, _actualizarMargen, _guardarTarea, _eliminarTarea,
    nuevoColaborador, _guardarColaborador,
    nuevoLote, _guardarLote
  };

})(window);
