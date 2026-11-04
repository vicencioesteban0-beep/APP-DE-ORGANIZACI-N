(function(window) {
  'use strict';

  async function render(container) {
    const [margen, horaInicio, maxSubs, pctAmbar, calibN, tema, bloques, calibracion, geminiKey] = await Promise.all([
      DB.getConfig('margenEstimado'),
      DB.getConfig('horaInicioObjetivo'),
      DB.getConfig('maxSubproyectosDia'),
      DB.getConfig('semaforoPorcentajeAmbar'),
      DB.getConfig('calibracionMediana'),
      DB.getConfig('tema'),
      Capacidad.getBloques(),
      Capacidad.calibrar(),
      DB.getConfig('geminiApiKey'),
    ]);

    const excHtml = await _renderExcepciones();

    container.innerHTML = `
      <div class="view-config">
        <h1>Configuración</h1>

        <!-- Calibración automática -->
        ${calibracion ? `
          <div class="config-section">
            <h2>Calibración del margen</h2>
            <div class="alert alert--${calibracion.sugerido ? 'warning' : 'success'}">
              Mediana real/estimado: <strong>${calibracion.mediana}×</strong> (basado en ${calibracion.n} tareas cerradas)
              ${calibracion.sugerido
                ? `<br>Sugerido: <strong>${calibracion.sugerido}×</strong> — <button class="btn btn--sm btn--outline" onclick="Views.Config._aplicarMargen(${calibracion.sugerido})">Aplicar</button>`
                : '<br>El margen actual es adecuado ✓'}
            </div>
          </div>
        ` : ''}

        <!-- Parámetros generales -->
        <div class="config-section">
          <h2>Parámetros generales</h2>
          <div class="form-group">
            <label class="form-label">Margen de estimación (×)</label>
            <input id="cfg-margen" type="number" step="0.05" min="1" max="3" class="form-input" value="${margen || 1.3}">
            <span class="form-hint">Multiplica el estimado base. 1.3 = 30% extra.</span>
          </div>
          <div class="form-group">
            <label class="form-label">Hora de inicio objetivo</label>
            <input id="cfg-hora" type="time" class="form-input" value="${horaInicio || '09:10'}">
          </div>
          <div class="form-group">
            <label class="form-label">Máx. subproyectos por día</label>
            <input id="cfg-maxsubs" type="number" min="1" max="10" class="form-input" value="${maxSubs || 2}">
          </div>
          <div class="form-group">
            <label class="form-label">% holgura para semáforo ámbar</label>
            <input id="cfg-pctambar" type="number" min="0" max="50" class="form-input" value="${pctAmbar || 15}">
            <span class="form-hint">Por debajo de este % = ámbar; 0 o menos = rojo.</span>
          </div>
          <div class="form-group">
            <label class="form-label">N tareas para calibración (mediana)</label>
            <input id="cfg-calibn" type="number" min="3" max="50" class="form-input" value="${calibN || 10}">
          </div>
          <div class="form-group">
            <label class="form-label">Tema</label>
            <select id="cfg-tema" class="form-select">
              <option value="auto" ${tema === 'auto' ? 'selected' : ''}>Automático (sistema)</option>
              <option value="light" ${tema === 'light' ? 'selected' : ''}>Claro</option>
              <option value="dark" ${tema === 'dark' ? 'selected' : ''}>Oscuro</option>
            </select>
          </div>
          <button class="btn btn--primary" onclick="Views.Config._guardarGeneral()">Guardar configuración</button>
        </div>

        <!-- Bloques del día -->
        <div class="config-section">
          <h2>Bloques del día</h2>
          <div id="config-bloques">
            ${_renderBloques(bloques)}
          </div>
          <button class="btn btn--outline btn--sm" onclick="Views.Config._agregarBloque()">+ Bloque</button>
        </div>

        <!-- Excepciones del calendario -->
        <div class="config-section">
          <h2>Excepciones del calendario</h2>
          <button class="btn btn--outline btn--sm" onclick="Views.Config._nuevaExcepcion()">+ Feriado / Día reducido</button>
          <div id="config-excepciones">${excHtml}</div>
        </div>

        <!-- Colaboradores -->
        <div class="config-section">
          <h2>Colaboradores</h2>
          <button class="btn btn--outline btn--sm" onclick="Views.Forms.nuevoColaborador()">+ Colaborador</button>
          <div id="config-colaboradores"></div>
        </div>

        <!-- Inteligencia Artificial -->
        <div class="config-section">
          <h2>Inteligencia Artificial — Gemini</h2>
          <p class="form-hint">
            La app usa la API de Google Gemini para mejorar textos, resumir notas y generar
            objetivos de aprendizaje. Tu clave se guarda solo en este dispositivo.
          </p>
          <div class="form-group">
            <label class="form-label">API Key de Gemini</label>
            <div style="display:flex;gap:var(--sp-2)">
              <input id="cfg-gemini-key" type="password" class="form-input"
                placeholder="AQ.Ab8RN…"
                value="${Utils.escape(geminiKey || '')}"
                autocomplete="off" spellcheck="false">
              <button class="btn btn--ghost btn--sm" id="cfg-gemini-toggle"
                onclick="Views.Config._toggleKeyVisibility()"
                title="Mostrar/ocultar">👁</button>
            </div>
            <span class="form-hint">
              Obtenla en
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener">
                aistudio.google.com/app/apikey
              </a>
            </span>
          </div>
          <div style="display:flex;gap:var(--sp-2);align-items:center">
            <button class="btn btn--primary" onclick="Views.Config._guardarGeminiKey()">Guardar clave</button>
            <button class="btn btn--ghost btn--sm" onclick="Views.Config._testGemini()">Probar conexión</button>
            <span id="cfg-gemini-status" class="form-hint" style="margin-left:var(--sp-2)">
              ${geminiKey ? '🟢 Clave configurada' : '⚪ Sin configurar'}
            </span>
          </div>
        </div>

        <!-- Exportar / Importar -->
        <div class="config-section">
          <h2>Exportar / Importar datos</h2>
          <p class="form-hint">Exporta todos tus datos como JSON para hacer respaldo.</p>
          <div style="display:flex;gap:var(--sp-2)">
            <button class="btn btn--outline" onclick="Views.Config._exportar()">Exportar JSON</button>
            <button class="btn btn--ghost" onclick="Views.Config._importar()">Importar JSON</button>
          </div>
        </div>
      </div>
    `;

    await _cargarColaboradores();
  }

  function _renderBloques(bloques) {
    return bloques.map(b => `
      <div class="config-bloque" data-id="${b.id}">
        <input class="form-input form-input--sm" type="text" value="${Utils.escape(b.nombre)}" onchange="Views.Config._actualizarBloque('${b.id}', 'nombre', this.value)">
        <input class="form-input form-input--sm" type="time" value="${b.inicio}" onchange="Views.Config._actualizarBloque('${b.id}', 'inicio', this.value)">
        <input class="form-input form-input--sm" type="time" value="${b.fin}" onchange="Views.Config._actualizarBloque('${b.id}', 'fin', this.value)">
        <select class="form-select form-select--sm" onchange="Views.Config._actualizarBloque('${b.id}', 'tipo', this.value)">
          ${['produccion_alta','produccion_media','coordinacion','comprobacion','rutina','pausa','margen'].map(t =>
            `<option value="${t}" ${b.tipo === t ? 'selected':''}>${Utils.labelTipoBloque(t)}</option>`
          ).join('')}
        </select>
        <button class="btn btn--icon btn--danger-ghost" onclick="Views.Config._eliminarBloque('${b.id}')">✕</button>
      </div>
    `).join('');
  }

  async function _renderExcepciones() {
    const excs = await DB.getAll(DB.S.E);
    const proximas = excs.filter(e => e.fecha >= Utils.hoy()).sort((a,b) => a.fecha.localeCompare(b.fecha));
    if (!proximas.length) return '<p class="form-hint">No hay excepciones próximas.</p>';
    return proximas.map(e => `
      <div class="config-excepcion">
        <span>${Utils.formatFecha(e.fecha, {largo:true})}</span>
        <span class="badge badge--${e.tipo === 'feriado' ? 'danger' : 'warning'}">${e.tipo === 'feriado' ? 'Feriado' : 'Cap. reducida'}</span>
        <span>${Utils.escape(e.descripcion || '')}</span>
        <button class="btn btn--icon" onclick="Views.Config._eliminarExcepcion('${e.id}')">✕</button>
      </div>
    `).join('');
  }

  async function _cargarColaboradores() {
    const colaboradores = await DB.getAll(DB.S.C);
    const container = document.getElementById('config-colaboradores');
    if (!container) return;
    container.innerHTML = colaboradores.map(c => `
      <div class="colab-card">
        <span>${Utils.escape(c.nombre)}</span>
        ${c.email ? `<span class="form-hint">${Utils.escape(c.email)}</span>` : ''}
        <button class="btn btn--ghost btn--sm" onclick="Views.Forms.nuevoColaborador({id:'${c.id}'})">Editar</button>
      </div>
    `).join('') || '<p class="form-hint">Sin colaboradores.</p>';
  }

  async function _guardarGeneral() {
    await Promise.all([
      DB.setConfig('margenEstimado',        parseFloat(document.getElementById('cfg-margen').value) || 1.3),
      DB.setConfig('horaInicioObjetivo',    document.getElementById('cfg-hora').value || '09:10'),
      DB.setConfig('maxSubproyectosDia',    parseInt(document.getElementById('cfg-maxsubs').value) || 2),
      DB.setConfig('semaforoPorcentajeAmbar', parseInt(document.getElementById('cfg-pctambar').value) || 15),
      DB.setConfig('calibracionMediana',    parseInt(document.getElementById('cfg-calibn').value) || 10),
    ]);
    const tema = document.getElementById('cfg-tema').value;
    await DB.setConfig('tema', tema);
    document.documentElement.dataset.theme = tema === 'auto' ? '' : tema;
    if (tema === 'auto') delete document.documentElement.dataset.theme;
    Utils.toast('Configuración guardada', 'success');
  }

  async function _aplicarMargen(valor) {
    await DB.setConfig('margenEstimado', valor);
    document.getElementById('cfg-margen').value = valor;
    Utils.toast('Margen actualizado a ' + valor + '×', 'success');
  }

  async function _actualizarBloque(id, campo, valor) {
    const b = await DB.getById(DB.S.B, id);
    if (!b) return;
    const updated = { ...b, [campo]: valor };
    // Recalculate duration if times changed
    if (campo === 'inicio' || campo === 'fin') {
      const [ih, im] = updated.inicio.split(':').map(Number);
      const [fh, fm] = updated.fin.split(':').map(Number);
      updated.duracion = (fh * 60 + fm) - (ih * 60 + im);
    }
    await DB.put(DB.S.B, updated);
    Utils.emit('data-changed', { store: DB.S.B });
  }

  async function _eliminarBloque(id) {
    const ok = await Utils.confirm('¿Eliminar este bloque?');
    if (!ok) return;
    await DB.remove(DB.S.B, id);
    Utils.emit('data-changed', { store: DB.S.B });
    Utils.toast('Bloque eliminado', 'info');
  }

  async function _agregarBloque() {
    const bloques = await Capacidad.getBloques();
    const orden = bloques.length ? Math.max(...bloques.map(b => b.orden||0)) + 1 : 0;
    await DB.put(DB.S.B, {
      id: DB.genId(),
      nombre: 'Nuevo bloque',
      inicio: '08:00', fin: '09:00',
      tipo: 'produccion_media',
      duracion: 60,
      orden
    });
    Utils.emit('data-changed', { store: DB.S.B });
    Utils.toast('Bloque agregado', 'success');
  }

  function _nuevaExcepcion() {
    Utils.modal(`
      <div class="modal-form">
        <h2 class="modal-form__title">Nueva excepción</h2>
        <div class="form-group">
          <label class="form-label">Fecha</label>
          <input id="exc-fecha" type="date" class="form-input" value="${Utils.hoy()}">
        </div>
        <div class="form-group">
          <label class="form-label">Tipo</label>
          <select id="exc-tipo" class="form-select">
            <option value="feriado">Feriado</option>
            <option value="capacidad_reducida">Capacidad reducida</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Descripción (opcional)</label>
          <input id="exc-desc" type="text" class="form-input" placeholder="ej: Día nacional" maxlength="100">
        </div>
        <div class="modal-form__actions">
          <button class="btn btn--ghost" id="exc-cancel">Cancelar</button>
          <button class="btn btn--primary" id="exc-ok">Guardar</button>
        </div>
      </div>
    `);
    document.getElementById('exc-cancel').onclick = () => Utils.closeModal();
    document.getElementById('exc-ok').onclick = async () => {
      const fecha = document.getElementById('exc-fecha').value;
      const tipo  = document.getElementById('exc-tipo').value;
      const desc  = document.getElementById('exc-desc').value.trim();
      if (!fecha) { Utils.toast('Indica una fecha', 'warning'); return; }
      await DB.put(DB.S.E, { fecha, tipo, descripcion: desc });
      Utils.closeModal();
      const container = document.getElementById('config-excepciones');
      if (container) container.innerHTML = await _renderExcepciones();
      Utils.toast('Excepción guardada', 'success');
    };
  }

  async function _eliminarExcepcion(id) {
    const ok = await Utils.confirm('¿Eliminar esta excepción?');
    if (!ok) return;
    await DB.remove(DB.S.E, id);
    const container = document.getElementById('config-excepciones');
    if (container) container.innerHTML = await _renderExcepciones();
    Utils.toast('Excepción eliminada', 'info');
  }

  async function _exportar() {
    const stores = ['proyectos','subproyectos','tareas','colaboradores','lotes','bloques','excepciones','metricas'];
    const data = {};
    for (const s of stores) data[s] = await DB.getAll(s);
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = 'planificador-backup-' + Utils.hoy() + '.json';
    a.click();
    URL.revokeObjectURL(url);
    Utils.toast('Datos exportados', 'success');
  }

  function _importar() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const ok = await Utils.confirm('¿Importar datos? Esto reemplazará los datos existentes en cada colección.');
        if (!ok) return;
        for (const [store, records] of Object.entries(data)) {
          if (Array.isArray(records)) {
            for (const rec of records) await DB.put(store, rec);
          }
        }
        Utils.emit('data-changed', {});
        Utils.toast('Datos importados correctamente', 'success');
      } catch(err) {
        Utils.toast('Error al importar: ' + err.message, 'danger');
      }
    };
    input.click();
  }

  async function _guardarGeminiKey() {
    const key = document.getElementById('cfg-gemini-key').value.trim();
    if (!key) { Utils.toast('Pega tu API key primero', 'warning'); return; }
    await DB.setConfig('geminiApiKey', key);
    const st = document.getElementById('cfg-gemini-status');
    if (st) st.textContent = '🟢 Clave guardada';
    Utils.toast('API key guardada', 'success');
  }

  async function _testGemini() {
    const key = document.getElementById('cfg-gemini-key').value.trim();
    if (!key) { Utils.toast('Primero ingresa la API key', 'warning'); return; }
    const st = document.getElementById('cfg-gemini-status');
    if (st) st.textContent = '⏳ Probando…';
    try {
      await AI.verificarKey(key);
      if (st) st.textContent = '🟢 Conexión exitosa';
      Utils.toast('Gemini conectado correctamente ✓', 'success');
    } catch(err) {
      if (st) st.textContent = '🔴 Error';
      Utils.toast('Error: ' + err.message, 'danger');
    }
  }

  function _toggleKeyVisibility() {
    const inp = document.getElementById('cfg-gemini-key');
    if (!inp) return;
    inp.type = inp.type === 'password' ? 'text' : 'password';
  }

  window.Views = window.Views || {};
  window.Views.Config = {
    render,
    _guardarGeneral, _aplicarMargen,
    _actualizarBloque, _eliminarBloque, _agregarBloque,
    _nuevaExcepcion, _eliminarExcepcion,
    _exportar, _importar,
    _guardarGeminiKey, _testGemini, _toggleKeyVisibility,
  };

})(window);
