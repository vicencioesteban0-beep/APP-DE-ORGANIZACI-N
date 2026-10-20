(function(window) {
  'use strict';

  async function render(container) {
    const [proyectos, subproyectos, colaboradores] = await Promise.all([
      DB.getAll(DB.S.P),
      DB.getAll(DB.S.SP),
      DB.getAll(DB.S.C)
    ]);

    const activos = proyectos.filter(p => p.estado !== 'archivado');
    const colabMap = Object.fromEntries(colaboradores.map(c => [c.id, c]));

    const cardsHtml = await Promise.all(activos.map(p => _renderProyectoCard(p, subproyectos, colabMap)));

    container.innerHTML = `
      <div class="view-portafolio">
        <div class="portafolio__header">
          <h1>Portafolio</h1>
          <button class="btn btn--primary btn--sm" onclick="Views.Forms.nuevoProyecto()">+ Proyecto</button>
        </div>
        ${activos.length === 0
          ? '<div class="empty-state"><p>No hay proyectos activos</p><button class="btn btn--primary" onclick="Views.Forms.nuevoProyecto()">Crear primer proyecto</button></div>'
          : `<div class="portafolio__grid">${cardsHtml.join('')}</div>`}
      </div>
    `;
  }

  async function _renderProyectoCard(p, todosSubproyectos, colabMap) {
    const subs = todosSubproyectos.filter(s => s.proyectoId === p.id);
    const margen = await Capacidad.calcMargenProyecto(p);

    let avanceTotal = 0;
    if (subs.length > 0) {
      const avances = await Promise.all(subs.map(s => Capacidad.calcAvancePonderado(s.id)));
      avanceTotal = Math.round(avances.reduce((a, b) => a + b, 0) / subs.length);
    }

    const diasRestantes = Utils.diasHabilesDesdeHoy(p.fechaEntrega);
    const colorDias = diasRestantes === null ? 'neutral' : diasRestantes < 3 ? 'danger' : diasRestantes < 7 ? 'warning' : 'success';

    const subsResumen = subs.slice(0, 3).map(s => {
      const colab = s.colaboradorId ? colabMap[s.colaboradorId] : null;
      return `
        <div class="portafolio__sub-item" onclick="window.location.hash='#subproyecto/${s.id}'">
          <span>${Utils.escape(Utils.truncate(s.nombre, 35))}</span>
          ${colab ? `<span class="portafolio__colab-initials">${Utils.initials(colab.nombre)}</span>` : ''}
        </div>
      `;
    }).join('');

    return `
      <div class="card portafolio__card" onclick="window.location.hash='#proyecto/${p.id}'">
        <div class="portafolio__card-header">
          <h3 class="portafolio__card-titulo">${Utils.escape(p.nombre)}</h3>
          ${margen ? `<span class="semaforo semaforo--${margen.semaforo}"></span>` : ''}
        </div>
        <div class="progress-bar">
          <div class="progress-bar__fill" style="width:${avanceTotal}%"></div>
        </div>
        <div class="portafolio__card-meta">
          <span>${avanceTotal}% completado</span>
          ${p.fechaEntrega ? `<span class="badge badge--${colorDias}">${Utils.formatFecha(p.fechaEntrega, {corto:true})}</span>` : ''}
        </div>
        ${margen ? `
          <div class="portafolio__margen">
            <span class="alert alert--${margen.semaforo === 'verde' ? 'success' : margen.semaforo === 'ambar' ? 'warning' : 'danger'} alert--inline">
              ${margen.margenDias >= 0 ? '+' : ''}${margen.margenDias} días hábiles
            </span>
          </div>
        ` : ''}
        <div class="portafolio__subs">
          ${subsResumen}
          ${subs.length > 3 ? `<div class="portafolio__subs-more">+${subs.length - 3} más</div>` : ''}
        </div>
      </div>
    `;
  }

  window.Views = window.Views || {};
  window.Views.Portafolio = { render };

})(window);
