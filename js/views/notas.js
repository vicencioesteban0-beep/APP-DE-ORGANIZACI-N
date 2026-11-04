(function(window) {
  'use strict';

  /* ── Estado del módulo ──────────────────────────────────── */
  let _notaActual    = null;
  let _modoPreview   = false;
  let _autoSaveTimer = null;
  let _guardado      = true;
  let _filtroTag     = null;
  let _queryBusqueda = '';

  /* ── Tags predefinidos para DI ──────────────────────────── */
  const TAGS_DI = [
    { id:'objetivos',   label:'Objetivos',    color:'blue'   },
    { id:'evaluacion',  label:'Evaluación',   color:'purple' },
    { id:'contenido',   label:'Contenido',    color:'green'  },
    { id:'metodologia', label:'Metodología',  color:'teal'   },
    { id:'recursos',    label:'Recursos',     color:'amber'  },
    { id:'feedback',    label:'Retroaliment.', color:'red'   },
    { id:'investigacion',label:'Investigación',color:'gray'  },
    { id:'ideas',       label:'Ideas',         color:'blue'  },
    { id:'reunion',     label:'Reunión',       color:'amber' },
    { id:'tarea',       label:'Tarea',         color:'green' },
  ];

  /* ── Plantillas DI ──────────────────────────────────────── */
  const PLANTILLAS = [
    {
      id: 'objetivos',
      icon: '🎯',
      nombre: 'Objetivos de Aprendizaje',
      desc: 'Redacta objetivos usando la taxonomía de Bloom',
      tags: ['objetivos'],
      contenido: `# Objetivos de Aprendizaje

**Proyecto / Curso:**
**Módulo / Unidad:**
**Nivel (Bloom):**

---

## Objetivos Terminales

Al finalizar esta unidad, el/la participante será capaz de:

1. **[RECORDAR]** ...
2. **[COMPRENDER]** ...
3. **[APLICAR]** ...
4. **[ANALIZAR]** ...
5. **[EVALUAR]** ...
6. **[CREAR]** ...

---

## Condiciones de desempeño

- **Dadas:** (recursos, herramientas, contexto)
- **El aprendiz:** (verbo de desempeño observable)
- **Con un estándar de:** (criterio de logro)

---

## Notas de alineación

> Conexión con evaluación:

> Conexión con contenidos:
`,
    },
    {
      id: 'sesion',
      icon: '📐',
      nombre: 'Diseño de Sesión',
      desc: 'Estructura completa de una sesión de aprendizaje',
      tags: ['contenido', 'metodologia'],
      contenido: `# Diseño de Sesión

**Título de la sesión:**
**Duración:**
**Modalidad:** ☐ Presencial  ☐ Virtual  ☐ Blended
**Perfil de aprendices:**

---

## Objetivos de la sesión

Al término de la sesión, el participante podrá:
-
-

---

## Agenda

| Tiempo | Actividad | Responsable | Recursos |
|--------|-----------|-------------|----------|
| 5 min  | Encuadre / bienvenida | Facilitador | |
| 15 min | Activación de conocimientos previos | | |
| 30 min | Presentación del contenido nuevo | | |
| 20 min | Práctica guiada | | |
| 20 min | Práctica independiente | | |
| 10 min | Cierre y retroalimentación | | |

---

## Estrategias de enseñanza

-

## Evaluación formativa

-

## Materiales

-

## Notas del facilitador

>
`,
    },
    {
      id: 'analisis',
      icon: '🔍',
      nombre: 'Análisis de Necesidades',
      desc: 'Marco ADDIE — fase de análisis',
      tags: ['investigacion'],
      contenido: `# Análisis de Necesidades de Capacitación

**Organización / Cliente:**
**Fecha:**
**Analista:**

---

## Brecha de desempeño

| Desempeño esperado | Desempeño actual | Brecha |
|-------------------|-----------------|--------|
| | | |

---

## Causas raíz

☐ Falta de conocimiento / habilidad
☐ Falta de práctica
☐ Falta de recursos o herramientas
☐ Falta de motivación o incentivo
☐ Problemas de proceso / entorno
☐ Otra:

---

## Perfil de la audiencia

- **Rol / cargo:**
- **Experiencia previa:**
- **Edad / generación (aprox.):**
- **Acceso a tecnología:**
- **Idioma / cultura:**
- **Número de aprendices:**
- **Horario disponible:**

---

## Recomendación de intervención

☐ Capacitación formal
☐ Apoyo en el puesto (OJT)
☐ Recurso de referencia (EPSS)
☐ Rediseño de proceso
☐ No aplica capacitación

**Justificación:**

---

## Restricciones del proyecto

- Presupuesto:
- Tiempo:
- Tecnología disponible:

---

## Fuentes consultadas

-
`,
    },
    {
      id: 'evaluacion',
      icon: '📊',
      nombre: 'Plan de Evaluación',
      desc: 'Evaluación de los 4 niveles de Kirkpatrick',
      tags: ['evaluacion'],
      contenido: `# Plan de Evaluación — Modelo Kirkpatrick

**Programa / Curso:**
**Fecha:**

---

## Nivel 1 — Reacción (¿Gustó?)

**Instrumento:** ☐ Encuesta  ☐ NPS  ☐ Focus group
**Momento:** ☐ Al terminar la sesión  ☐ 24–48 h después
**Preguntas clave:**
1.
2.
3.

**Meta de satisfacción:**

---

## Nivel 2 — Aprendizaje (¿Aprendió?)

**Tipo de evaluación:** ☐ Pre/Post test  ☐ Prueba de desempeño  ☐ Simulación
**Rúbrica / criterio de logro:**

| Objetivo | Instrumento | Criterio de aprobación |
|----------|-------------|----------------------|
| | | |

---

## Nivel 3 — Conducta (¿Lo aplica?)

**Momento:** ☐ 30 días  ☐ 60 días  ☐ 90 días
**Método:** ☐ Observación  ☐ Encuesta a jefes  ☐ Revisión de indicadores
**Indicadores de transferencia:**

-

---

## Nivel 4 — Resultados (¿Impactó?)

**Indicadores de negocio:**
**Línea base:**
**Meta:**
**Responsable del seguimiento:**

---

## Plan de seguimiento

| Acción | Fecha | Responsable |
|--------|-------|-------------|
| | | |
`,
    },
    {
      id: 'perfil',
      icon: '👥',
      nombre: 'Perfil de Aprendices',
      desc: 'Análisis de audiencia y segmentación',
      tags: ['investigacion', 'contenido'],
      contenido: `# Perfil de Aprendices

**Programa:**
**Fecha:**

---

## Datos demográficos

- **Cargo / rol:**
- **Departamento / área:**
- **Rango de edad:**
- **Género (si aplica):**
- **Nivel educativo:**
- **Antigüedad en la organización:**

---

## Contexto laboral

- **Responsabilidades principales:**
- **Herramientas que usan cotidianamente:**
- **Desafíos más frecuentes:**

---

## Conocimientos previos

| Tema | Ninguno | Básico | Intermedio | Avanzado |
|------|---------|--------|------------|----------|
| | | | | |

---

## Estilo de aprendizaje predominante

☐ Visual  ☐ Auditivo  ☐ Lecto-escritura  ☐ Kinestésico

**Preferencias de aprendizaje:**

---

## Acceso a tecnología

- **Dispositivos disponibles:**
- **Conectividad:**
- **Plataformas que ya conocen:**

---

## Motivadores y barreras

**Motivadores:**
-

**Barreras:**
-

---

## Implicaciones para el diseño

> Lo que este perfil me dice que debo hacer diferente:

`,
    },
    {
      id: 'reunion',
      icon: '🗣️',
      nombre: 'Notas de Reunión',
      desc: 'Acta rápida con acuerdos y seguimiento',
      tags: ['reunion'],
      contenido: `# Notas de Reunión

**Fecha:**
**Duración:**
**Facilitador:**
**Participantes:**

---

## Agenda

1.
2.
3.

---

## Puntos tratados

### 1.

### 2.

### 3.

---

## Acuerdos y compromisos

| Acción | Responsable | Fecha límite |
|--------|-------------|--------------|
| | | |

---

## Próxima reunión

**Fecha:**
**Temas pendientes:**

---

## Notas adicionales

>
`,
    },
    {
      id: 'libre',
      icon: '📝',
      nombre: 'Nota libre',
      desc: 'Comienza con una página en blanco',
      tags: [],
      contenido: '',
    },
  ];

  /* ── Parser Markdown liviano (sin dependencias) ───────── */
  function parseMd(text) {
    if (!text) return '';
    let html = text
      // Escape HTML
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      // Bloques de código (triple backtick)
      .replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) =>
        `<pre><code class="lang-${lang || 'text'}">${code.trim()}</code></pre>`)
      // Encabezados
      .replace(/^######\s(.+)$/gm, '<h6>$1</h6>')
      .replace(/^#####\s(.+)$/gm, '<h5>$1</h5>')
      .replace(/^####\s(.+)$/gm, '<h4>$1</h4>')
      .replace(/^###\s(.+)$/gm, '<h3>$1</h3>')
      .replace(/^##\s(.+)$/gm, '<h2>$1</h2>')
      .replace(/^#\s(.+)$/gm, '<h1>$1</h1>')
      // Separadores
      .replace(/^---+$/gm, '<hr>')
      // Negrita e itálica
      .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/_(.+?)_/g, '<em>$1</em>')
      // Código inline
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // Blockquotes
      .replace(/^&gt;\s(.+)$/gm, '<blockquote>$1</blockquote>')
      // Listas de tareas (checklist)
      .replace(/^- \[x\]\s(.+)$/gim, '<li class="task-item"><input type="checkbox" checked disabled> $1</li>')
      .replace(/^- \[ \]\s(.+)$/gim, '<li class="task-item"><input type="checkbox" disabled> $1</li>')
      // Listas no ordenadas
      .replace(/^[-*]\s(.+)$/gm, '<li>$1</li>')
      // Listas ordenadas
      .replace(/^\d+\.\s(.+)$/gm, '<li>$1</li>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      // Tablas simples
      .replace(/\|(.+)\|\n\|[-| :]+\|\n((?:\|.+\|\n?)*)/g, (_, header, rows) => {
        const ths = header.split('|').filter(c => c.trim()).map(c => `<th>${c.trim()}</th>`).join('');
        const trs = rows.trim().split('\n').map(row => {
          const tds = row.split('|').filter(c => c.trim()).map(c => `<td>${c.trim()}</td>`).join('');
          return `<tr>${tds}</tr>`;
        }).join('');
        return `<table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`;
      });

    // Wrap consecutive <li> in <ul>
    html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');
    // Wrap task items
    html = html.replace(/((?:<li class="task-item">.*<\/li>\n?)+)/g, '<ul>$1</ul>');

    // Párrafos: líneas que no son bloque
    const lines = html.split('\n');
    const result = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) { result.push(''); continue; }
      const isBlock = /^<(h[1-6]|hr|pre|ul|ol|li|table|thead|tbody|blockquote|div)/.test(trimmed);
      result.push(isBlock ? trimmed : `<p>${trimmed}</p>`);
    }

    return result.join('\n');
  }

  /* ── Helpers ────────────────────────────────────────────── */
  function _tagColor(tagId) {
    const t = TAGS_DI.find(x => x.id === tagId);
    return t ? t.color : 'gray';
  }

  function _tagLabel(tagId) {
    const t = TAGS_DI.find(x => x.id === tagId);
    return t ? t.label : tagId;
  }

  function _countWords(text) {
    return text ? text.trim().split(/\s+/).filter(Boolean).length : 0;
  }

  function _countChars(text) {
    return text ? text.length : 0;
  }

  function _fechaCorta(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const hoy = new Date();
    const diff = Math.floor((hoy - d) / 86400000);
    if (diff === 0) return 'hoy';
    if (diff === 1) return 'ayer';
    if (diff < 7)   return `hace ${diff} días`;
    return d.toLocaleDateString('es-CL', { day:'numeric', month:'short' });
  }

  function _htmlTagsList(tags, options = {}) {
    if (!tags || !tags.length) return '';
    return tags.map(t =>
      `<span class="tag tag--${_tagColor(t)}">${_tagLabel(t)}</span>`
    ).join('');
  }

  /* ── Render: lista de notas ─────────────────────────────── */
  async function _renderLista(container) {
    let notas = await DB.buscarNotas(_queryBusqueda);
    if (_filtroTag) {
      notas = notas.filter(n => (n.tags || []).includes(_filtroTag));
    }
    // Fijadas primero, luego por fecha
    notas.sort((a, b) => {
      if (a.fijada && !b.fijada) return -1;
      if (!a.fijada && b.fijada) return 1;
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });

    if (!notas.length) {
      container.innerHTML = `
        <div class="notas-list__empty">
          <svg width="40" height="40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
          ${_queryBusqueda || _filtroTag ? 'Sin resultados' : 'Sin notas aún'}
        </div>`;
      return;
    }

    container.innerHTML = notas.map(n => `
      <div class="nota-item${_notaActual?.id === n.id ? ' active' : ''}"
           data-id="${n.id}" onclick="Views.Notas._abrirNota('${n.id}')">
        ${n.fijada ? '<span class="nota-item__pin">📌</span>' : ''}
        <div class="nota-item__titulo">${Utils.escape(n.titulo || 'Sin título')}</div>
        <div class="nota-item__preview">${Utils.escape((n.contenido || '').slice(0, 120))}</div>
        <div class="nota-item__meta">
          <span class="nota-item__fecha">${_fechaCorta(n.updatedAt)}</span>
          ${_htmlTagsList(n.tags)}
        </div>
      </div>
    `).join('');
  }

  /* ── Render: editor ─────────────────────────────────────── */
  function _renderEditorVacio(container) {
    container.innerHTML = `
      <div class="notas-empty-state">
        <div class="notas-empty-state__icon">📒</div>
        <h3>Sin nota seleccionada</h3>
        <p class="text-sm text-2">Selecciona una nota o crea una nueva</p>
        <button class="btn btn--primary" onclick="Views.Notas._nuevaNota()">Nueva nota</button>
      </div>`;
  }

  async function _renderEditor(container, nota) {
    const proyectos = await DB.getAll(DB.S.P);
    const proyectoOpts = proyectos
      .filter(p => p.estado === 'activo')
      .map(p => `<option value="${p.id}"${nota.proyectoId === p.id ? ' selected' : ''}>${Utils.escape(p.nombre)}</option>`)
      .join('');
    const proyectoActual = nota.proyectoId
      ? proyectos.find(p => p.id === nota.proyectoId)
      : null;

    container.innerHTML = `
      <div class="editor-toolbar">
        <div class="editor-toolbar__group">
          <button class="editor-btn" title="Encabezado 1" onclick="Views.Notas._fmt('h1')"><b>H1</b></button>
          <button class="editor-btn" title="Encabezado 2" onclick="Views.Notas._fmt('h2')"><b>H2</b></button>
          <button class="editor-btn" title="Encabezado 3" onclick="Views.Notas._fmt('h3')"><b>H3</b></button>
        </div>
        <div class="editor-toolbar__group">
          <button class="editor-btn" title="Negrita" onclick="Views.Notas._fmt('bold')"><b>B</b></button>
          <button class="editor-btn" title="Cursiva"  onclick="Views.Notas._fmt('italic')"><i>I</i></button>
          <button class="editor-btn" title="Código inline" onclick="Views.Notas._fmt('code')" style="font-family:monospace">&lt;/&gt;</button>
        </div>
        <div class="editor-toolbar__group">
          <button class="editor-btn" title="Lista" onclick="Views.Notas._fmt('ul')">≡</button>
          <button class="editor-btn" title="Lista numerada" onclick="Views.Notas._fmt('ol')">1.</button>
          <button class="editor-btn" title="Lista de tareas" onclick="Views.Notas._fmt('task')">☐</button>
          <button class="editor-btn" title="Cita" onclick="Views.Notas._fmt('quote')">"</button>
        </div>
        <div class="editor-toolbar__group">
          <button class="editor-btn" title="Separador" onclick="Views.Notas._fmt('hr')">—</button>
        </div>
        <div class="editor-toolbar__group">
          <button class="editor-btn${nota.fijada ? ' active' : ''}" title="${nota.fijada ? 'Desfijar' : 'Fijar nota'}"
            onclick="Views.Notas._togglePin()">📌</button>
          <button class="editor-btn" title="Exportar como .md"
            onclick="Views.Notas._exportar()">↓</button>
          <button class="editor-btn" title="Eliminar nota"
            onclick="Views.Notas._eliminarNota()" style="color:var(--c-replan)">🗑</button>
        </div>
        <div class="editor-tabs">
          <button class="editor-tab${!_modoPreview ? ' active' : ''}" onclick="Views.Notas._setPreview(false)">Editar</button>
          <button class="editor-tab${_modoPreview ? ' active' : ''}" onclick="Views.Notas._setPreview(true)">Vista previa</button>
        </div>
      </div>

      <div class="editor-header">
        <input id="nota-titulo" class="editor-title" type="text"
          placeholder="Título de la nota…"
          value="${Utils.escape(nota.titulo || '')}"
          oninput="Views.Notas._onTituloChange(this.value)">
        <div class="editor-meta">
          ${proyectoActual
            ? `<a class="editor-proyecto-link" href="#proyecto/${proyectoActual.id}">🗂 ${Utils.escape(proyectoActual.nombre)}</a>`
            : ''}
          <span class="editor-meta__info" id="nota-fechas">
            Creada ${_fechaCorta(nota.createdAt)} · Editada ${_fechaCorta(nota.updatedAt)}
          </span>
          <div class="editor-meta__tags" id="nota-tags-display">
            ${_htmlTagsList(nota.tags)}
          </div>
        </div>
      </div>

      <div class="editor-body" id="editor-body">
        <textarea id="nota-contenido" class="editor-textarea${_modoPreview ? ' hidden' : ''}"
          placeholder="Escribe en Markdown…"
          oninput="Views.Notas._onContenidoChange(this.value)"
          spellcheck="true">${Utils.escape(nota.contenido || '')}</textarea>
        <div id="nota-preview" class="editor-preview md-preview${_modoPreview ? ' visible' : ''}">
          ${parseMd(nota.contenido || '')}
        </div>
      </div>

      <div class="tag-picker" id="tag-picker">
        ${TAGS_DI.map(t => `
          <span class="tag tag--${t.color} tag-picker__tag${(nota.tags||[]).includes(t.id) ? ' selected' : ''}"
            data-tag="${t.id}"
            onclick="Views.Notas._toggleTag('${t.id}')">
            ${t.label}
          </span>`).join('')}
        ${proyectoOpts ? `
          <select id="nota-proyecto" class="form-input" style="font-size:var(--fs-xs);padding:2px 8px;min-height:0;height:26px;margin-left:auto"
            onchange="Views.Notas._onProyectoChange(this.value)">
            <option value="">Sin proyecto</option>
            ${proyectoOpts}
          </select>` : ''}
      </div>

      <div class="editor-footer">
        <div class="editor-footer__status">
          <span id="nota-wc">0 palabras</span>
          <span id="nota-cc">0 caracteres</span>
        </div>
        <div class="editor-footer__save" id="nota-save-status">Guardado</div>
      </div>`;

    _actualizarContadores(nota.contenido || '');
  }

  function _actualizarContadores(text) {
    const wc = document.getElementById('nota-wc');
    const cc = document.getElementById('nota-cc');
    if (wc) wc.textContent = `${_countWords(text)} palabras`;
    if (cc) cc.textContent = `${_countChars(text)} caracteres`;
  }

  /* ── Acciones del editor ────────────────────────────────── */
  function _onTituloChange(val) {
    if (!_notaActual) return;
    _notaActual.titulo = val;
    _marcarNoGuardado();
  }

  function _onContenidoChange(val) {
    if (!_notaActual) return;
    _notaActual.contenido = val;
    _actualizarContadores(val);
    _marcarNoGuardado();
    if (_modoPreview) {
      const prev = document.getElementById('nota-preview');
      if (prev) prev.innerHTML = parseMd(val);
    }
  }

  function _onProyectoChange(val) {
    if (!_notaActual) return;
    _notaActual.proyectoId = val || null;
    _marcarNoGuardado();
  }

  function _marcarNoGuardado() {
    _guardado = false;
    const el = document.getElementById('nota-save-status');
    if (el) { el.textContent = 'Sin guardar…'; el.className = 'editor-footer__save'; }
    clearTimeout(_autoSaveTimer);
    _autoSaveTimer = setTimeout(_autoGuardar, 1500);
  }

  async function _autoGuardar() {
    if (!_notaActual || _guardado) return;
    await DB.put(DB.S.N, _notaActual);
    _notaActual.updatedAt = new Date().toISOString();
    _guardado = true;
    const el = document.getElementById('nota-save-status');
    if (el) { el.textContent = 'Guardado'; el.className = 'editor-footer__save saved'; }
    // Refresca lista sin perder el foco
    const lista = document.getElementById('notas-lista');
    if (lista) await _renderLista(lista);
  }

  function _setPreview(val) {
    _modoPreview = val;
    const ta   = document.getElementById('nota-contenido');
    const prev = document.getElementById('nota-preview');
    const tabs = document.querySelectorAll('.editor-tab');
    if (!ta || !prev) return;
    if (val) {
      ta.classList.add('hidden');
      prev.classList.add('visible');
      prev.innerHTML = parseMd(_notaActual?.contenido || '');
    } else {
      ta.classList.remove('hidden');
      prev.classList.remove('visible');
    }
    tabs.forEach((t, i) => t.classList.toggle('active', i === (val ? 1 : 0)));
  }

  /* ── Formato rápido ─────────────────────────────────────── */
  function _fmt(tipo) {
    const ta = document.getElementById('nota-contenido');
    if (!ta) return;
    const start = ta.selectionStart;
    const end   = ta.selectionEnd;
    const sel   = ta.value.substring(start, end);
    let insert  = '';
    let offset  = 0;

    switch(tipo) {
      case 'h1':     insert = `# ${sel || 'Título 1'}\n`;   offset = 2; break;
      case 'h2':     insert = `## ${sel || 'Título 2'}\n`;  offset = 3; break;
      case 'h3':     insert = `### ${sel || 'Título 3'}\n`; offset = 4; break;
      case 'bold':   insert = `**${sel || 'negrita'}**`;    offset = 2; break;
      case 'italic': insert = `*${sel || 'cursiva'}*`;      offset = 1; break;
      case 'code':   insert = `\`${sel || 'código'}\``;     offset = 1; break;
      case 'ul':     insert = `- ${sel || 'elemento'}\n`;   offset = 2; break;
      case 'ol':     insert = `1. ${sel || 'elemento'}\n`;  offset = 3; break;
      case 'task':   insert = `- [ ] ${sel || 'tarea'}\n`;  offset = 6; break;
      case 'quote':  insert = `> ${sel || 'cita'}\n`;       offset = 2; break;
      case 'hr':     insert = `\n---\n`;                    offset = 5; break;
    }

    const before = ta.value.substring(0, start);
    const after  = ta.value.substring(end);
    ta.value     = before + insert + after;
    ta.selectionStart = ta.selectionEnd = start + insert.length - (sel ? 0 : 0);
    ta.focus();
    _onContenidoChange(ta.value);
  }

  /* ── Tags ───────────────────────────────────────────────── */
  async function _toggleTag(tagId) {
    if (!_notaActual) return;
    const tags = _notaActual.tags || [];
    const idx  = tags.indexOf(tagId);
    if (idx >= 0) tags.splice(idx, 1); else tags.push(tagId);
    _notaActual.tags = tags;
    // Actualizar visualmente
    document.querySelectorAll('.tag-picker__tag').forEach(el => {
      el.classList.toggle('selected', tags.includes(el.dataset.tag));
    });
    const disp = document.getElementById('nota-tags-display');
    if (disp) disp.innerHTML = _htmlTagsList(tags);
    _marcarNoGuardado();
  }

  async function _togglePin() {
    if (!_notaActual) return;
    _notaActual.fijada = !_notaActual.fijada;
    await DB.put(DB.S.N, _notaActual);
    // Re-render completo del editor para actualizar botón
    const editorContainer = document.getElementById('notas-editor');
    if (editorContainer) await _renderEditor(editorContainer, _notaActual);
    const lista = document.getElementById('notas-lista');
    if (lista) await _renderLista(lista);
    Utils.toast(_notaActual.fijada ? 'Nota fijada' : 'Nota desfijada', 'success');
  }

  /* ── Abrir nota ─────────────────────────────────────────── */
  async function _abrirNota(id) {
    if (_notaActual && !_guardado) await _autoGuardar();
    _notaActual = await DB.getById(DB.S.N, id);
    if (!_notaActual) return;

    const lista = document.getElementById('notas-lista');
    const editorContainer = document.getElementById('notas-editor');
    if (lista) await _renderLista(lista);
    if (editorContainer) await _renderEditor(editorContainer, _notaActual);

    // Mobile: mostrar editor
    const sidebar = document.querySelector('.notas-sidebar');
    if (window.innerWidth <= 768 && sidebar) {
      sidebar.classList.remove('mobile-visible');
    }
  }

  /* ── Nueva nota ─────────────────────────────────────────── */
  async function _nuevaNota(opts = {}) {
    const nueva = await DB.put(DB.S.N, {
      titulo: opts.titulo || '',
      contenido: opts.contenido || '',
      tags: opts.tags || [],
      fijada: false,
      proyectoId: opts.proyectoId || null,
      plantilla: opts.plantilla || null,
    });
    _notaActual = nueva;
    const lista = document.getElementById('notas-lista');
    const editorContainer = document.getElementById('notas-editor');
    if (lista) await _renderLista(lista);
    if (editorContainer) await _renderEditor(editorContainer, _notaActual);
    // Focus en el título
    setTimeout(() => {
      const ti = document.getElementById('nota-titulo');
      if (ti) ti.focus();
    }, 50);
  }

  /* ── Plantillas modal ───────────────────────────────────── */
  function _mostrarPlantillas() {
    const html = `
      <div class="modal-form" style="max-width:680px">
        <h2 class="modal-form__title">Elegir plantilla</h2>
        <div class="plantillas-grid">
          ${PLANTILLAS.map(p => `
            <div class="plantilla-card" onclick="Views.Notas._usarPlantilla('${p.id}')">
              <div class="plantilla-card__icon">${p.icon}</div>
              <div class="plantilla-card__nombre">${p.nombre}</div>
              <div class="plantilla-card__desc">${p.desc}</div>
            </div>`).join('')}
        </div>
        <div class="form-actions">
          <button class="btn btn--ghost" onclick="Utils.closeModal()">Cancelar</button>
        </div>
      </div>`;
    Utils.modal(html);
  }

  async function _usarPlantilla(id) {
    const plantilla = PLANTILLAS.find(p => p.id === id);
    if (!plantilla) return;
    Utils.closeModal();
    await _nuevaNota({
      titulo: plantilla.nombre,
      contenido: plantilla.contenido,
      tags: plantilla.tags,
      plantilla: plantilla.id,
    });
  }

  /* ── Eliminar nota ──────────────────────────────────────── */
  async function _eliminarNota() {
    if (!_notaActual) return;
    const ok = await Utils.confirm('¿Eliminar esta nota? No se puede deshacer.');
    if (!ok) return;
    await DB.remove(DB.S.N, _notaActual.id);
    _notaActual = null;
    clearTimeout(_autoSaveTimer);
    const lista = document.getElementById('notas-lista');
    const editorContainer = document.getElementById('notas-editor');
    if (lista) await _renderLista(lista);
    if (editorContainer) _renderEditorVacio(editorContainer);
    Utils.toast('Nota eliminada', 'success');
  }

  /* ── Exportar ───────────────────────────────────────────── */
  function _exportar() {
    if (!_notaActual) return;
    const titulo   = _notaActual.titulo || 'nota';
    const filename = titulo.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '.md';
    const header   = `---\ntitle: ${_notaActual.titulo || ''}\ntags: [${(_notaActual.tags||[]).join(', ')}]\ncreated: ${_notaActual.createdAt}\nupdated: ${_notaActual.updatedAt}\n---\n\n`;
    const content  = header + (_notaActual.contenido || '');
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    Utils.toast(`Exportado como ${filename}`, 'success');
  }

  /* ── Render principal ───────────────────────────────────── */
  async function render(main) {
    main.innerHTML = `
      <div class="notas-layout">
        <div class="notas-sidebar" id="notas-sidebar">

          <div class="notas-search">
            <span class="notas-search__icon">🔍</span>
            <input id="notas-busqueda" class="notas-search__input"
              type="search" placeholder="Buscar notas…"
              value="${Utils.escape(_queryBusqueda)}"
              oninput="Views.Notas._onBusqueda(this.value)">
          </div>

          <div class="notas-tags-filter" id="notas-tags-filter">
            ${TAGS_DI.map(t => `
              <span class="tag tag--${t.color} tag--filter${_filtroTag === t.id ? '' : ' off'}"
                onclick="Views.Notas._setFiltroTag('${t.id}')">${t.label}</span>`).join('')}
          </div>

          <div style="display:flex;gap:var(--sp-2);margin-bottom:var(--sp-1)">
            <button class="btn btn--primary btn--sm" style="flex:1"
              onclick="Views.Notas._nuevaNota()">+ Nueva nota</button>
            <button class="btn btn--ghost btn--sm"
              onclick="Views.Notas._mostrarPlantillas()" title="Plantillas DI">📋</button>
          </div>

          <div class="notas-list" id="notas-lista"></div>
        </div>

        <div class="notas-editor" id="notas-editor">
          <div class="notas-empty-state">
            <div class="notas-empty-state__icon">📒</div>
            <h3>Tus notas de DI</h3>
            <p class="text-sm text-2">Selecciona una nota, crea una nueva o elige una plantilla</p>
            <div style="display:flex;gap:var(--sp-3);flex-wrap:wrap;justify-content:center">
              <button class="btn btn--primary" onclick="Views.Notas._nuevaNota()">Nueva nota</button>
              <button class="btn btn--ghost" onclick="Views.Notas._mostrarPlantillas()">Usar plantilla</button>
            </div>
          </div>
        </div>
      </div>`;

    // Render lista inicial
    await _renderLista(document.getElementById('notas-lista'));

    // Reabrir nota previa si existe
    if (_notaActual) {
      const fresca = await DB.getById(DB.S.N, _notaActual.id);
      if (fresca) {
        _notaActual = fresca;
        await _renderEditor(document.getElementById('notas-editor'), _notaActual);
        await _renderLista(document.getElementById('notas-lista'));
      }
    }
  }

  /* ── Búsqueda y filtros ─────────────────────────────────── */
  async function _onBusqueda(val) {
    _queryBusqueda = val;
    const lista = document.getElementById('notas-lista');
    if (lista) await _renderLista(lista);
  }

  async function _setFiltroTag(tagId) {
    _filtroTag = (_filtroTag === tagId) ? null : tagId;
    // Actualiza estilos de los chips de filtro
    document.querySelectorAll('#notas-tags-filter .tag--filter').forEach(el => {
      const isActive = el.textContent.trim() === _tagLabel(_filtroTag);
      el.classList.toggle('off', !(_filtroTag && TAGS_DI.find(t => t.id === _filtroTag)?.label === el.textContent.trim()));
    });
    // Re-render con filtro correcto
    const lista = document.getElementById('notas-lista');
    if (lista) await _renderLista(lista);
    // Reconstruye los chips con el estado correcto
    const filterContainer = document.getElementById('notas-tags-filter');
    if (filterContainer) {
      filterContainer.innerHTML = TAGS_DI.map(t => `
        <span class="tag tag--${t.color} tag--filter${_filtroTag === t.id ? '' : ' off'}"
          onclick="Views.Notas._setFiltroTag('${t.id}')">${t.label}</span>`).join('');
    }
  }

  window.Views = window.Views || {};
  window.Views.Notas = {
    render,
    _nuevaNota,
    _abrirNota,
    _mostrarPlantillas,
    _usarPlantilla,
    _eliminarNota,
    _exportar,
    _togglePin,
    _toggleTag,
    _onTituloChange,
    _onContenidoChange,
    _onProyectoChange,
    _setPreview,
    _fmt,
    _onBusqueda,
    _setFiltroTag,
  };

})(window);
