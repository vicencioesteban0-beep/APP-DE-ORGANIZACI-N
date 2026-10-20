(function(window) {
  'use strict';

  async function render(container, proyectoId) {
    const [proyecto, todosSubproyectos, colaboradores] = await Promise.all([
      DB.getById(DB.S.P, proyectoId),
      DB.getByIndex(DB.S.SP, 'proyectoId', proyectoId),
      DB.getAll(DB.S.C)
    ]);

    if (!proyecto) {
      container.innerHTML = '<div class="empty-state"><p>Proyecto no encontrado</p></div>';
      return;
    }

    const colabMap = Object.fromEntries(colaboradores.map(c => [c.id, c]));
    const margen   = await Capacidad.calcMargenProyecto(proyecto);

    let avanceTotal = 0;
    if (todosSubproyectos.length > 0) {
      const avances = await Promise.all(todosSubproyectos.map(s => Capacidad.calcAvancePonderado(s.id)));
      avanceTotal = Math.round(avances.reduce((a, b) => a + b, 0) / todosSubproyectos.length);
    }

    const diasRestantes = Utils.diasHabilesDesdeHoy(proyecto.fechaEntrega);

    const subsHtml = await Promise.all(
      todosSubproyectos.map(s => _renderSubCard(s, colabMap))
    );

    container.innerHTML = `
      <div class="view-proyecto">
        <div class="view-proyecto__back">
          <button class="btn btn--ghost btn--sm" onclick="window.history.back()">← Portafolio</button>
        </div>
        <div class="view-proyecto__header">
          <div>
            <h1>${Utils.escape(proyecto.nombre)}</h1>
            ${proyecto.descripcion ? `<p class="view-proyecto__desc">${Utils.escape(proyecto.descripcion)}</p>` : ''}
          </div>
          <div class="view-proyecto__header-acciones">
            <button class="btn btn--ghost btn--sm" onclick="Views.Forms.nuevoProyecto({id:'${proyecto.id}'})">Editar</button>
            <button class="btn btn--primary btn--sm" onclick="Views.Forms.nuevoSubproyecto({proyectoId:'${proyecto.id}'})">+ Subproyecto</button>
          </div>
        </div>

        <div class="view-proyecto__resumen">
          <div class="view-proyecto__stat">
            <span class="view-proyecto__stat-label">Avance</span>
            <div class="progress-bar">
              <div class="progress-bar__fill" style="width:${avanceTotal}%"></div>
            </div>
            <span class="view-proyecto__stat-val">${avanceTotal}%</span>
          </div>
          ${proyecto.fechaEntrega ? `
            <div class="view-proyecto__stat">
              <span class="view-proyecto__stat-label">Entrega</span>
              <span class="view-proyecto__stat-val">${Utils.formatFecha(proyecto.fechaEntrega, {largo:true})}</span>
              <span class="badge badge--${diasRestantes === null ? '' : diasRestantes < 3 ? 'danger' : diasRestantes < 7 ? 'warning' : 'success'}">
                ${diasRestantes !== null ? diasRestantes + ' días hábiles' : ''}
              </span>
            </div>
          ` : ''}
          ${margen ? `
            <div class="view-proyecto__stat">
              <span class="view-proyecto__stat-label">Margen</span>
              <span class="semaforo semaforo--${margen.semaforo}"></span>
              <span class="view-proyecto__stat-val">${margen.margenDias >= 0 ? '+' : ''}${margen.margenDias} días</span>
              <span class="view-proyecto__stat-sub">${Utils.formatHoras(margen.horasRestantes)} por hacer</span>
            </div>
          ` : ''}
        </div>

        <div class="view-proyecto__subs">
          <h2>Subproyectos (${todosSubproyectos.length})</h2>
          ${todosSubproyectos.length === 0
            ? '<div class="empty-state"><p>Sin subproyectos todavía</p></div>'
            : `<div class="subs-grid">${subsHtml.join('')}</div>`}
        </div>
      </div>
    `;
  }

  async function _renderSubCard(s, colabMap) {
    const [avance, tareas] = await Promise.all([
      Capacidad.calcAvancePonderado(s.id),
      DB.getByIndex(DB.S.T, 'subproyectoId', s.id)
    ]);
    const colab = s.colaboradorId ? colabMap[s.colaboradorId] : null;
    const pendientes = tareas.filter(t => t.estado !== 'hecha').length;
    const enCurso = tareas.filter(t => t.estado === 'en_curso').length;

    return `
      <div class="sub-card sub-card--${s.estado || 'activo'}" onclick="window.location.hash='#subproyecto/${s.id}'">
        <div class="sub-card__header">
          <span class="sub-card__nombre">${Utils.escape(s.nombre)}</span>
          <span class="badge badge--${s.estado === 'listo' ? 'success' : s.estado === 'bloqueado' ? 'danger' : 'info'}">
            ${Utils.labelEstado(s.estado || 'activo')}
          </span>
        </div>
        ${colab ? `<div class="sub-card__colab">${Utils.escape(colab.nombre)}</div>` : ''}
        <div class="progress-bar">
          <div class="progress-bar__fill" style="width:${avance}%"></div>
        </div>
        <div class="sub-card__meta">
          <span>${avance}%</span>
          <span>${pendientes} pendiente${pendientes !== 1 ? 's':''}</span>
          ${enCurso ? `<span class="badge badge--info">${enCurso} en curso</span>` : ''}
          ${Plantillas.getLabel(s.tipo) ? `<span class="badge badge--neutral">${Plantillas.getLabel(s.tipo)}</span>` : ''}
        </div>
      </div>
    `;
  }

  window.Views = window.Views || {};
  window.Views.Proyecto = { render };

})(window);
