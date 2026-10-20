(function(window) {
  'use strict';

  const TIPO_PROD = ['produccion_alta', 'produccion_media'];
  const TIPO_COORD = ['coordinacion'];
  const TIPO_COMP  = ['comprobacion'];

  async function getBloques() {
    const bs = await DB.getAll(DB.S.B);
    return bs.sort((a,b) => (a.orden||0) - (b.orden||0));
  }

  async function getExcepcionDia(fechaStr) {
    const excs = await DB.getByIndex(DB.S.E, 'fecha', fechaStr);
    return excs[0] || null;
  }

  async function getCapacidadDia(fechaStr) {
    const d = new Date(fechaStr + 'T12:00:00').getDay();
    if (d === 0 || d === 6) return { tipo:'libre',    produccion:0, coordinacion:0, comprobacion:0, bloques:[] };

    const exc = await getExcepcionDia(fechaStr);
    if (exc?.tipo === 'feriado')    return { tipo:'feriado',  produccion:0, coordinacion:0, comprobacion:0, bloques:[] };

    const bloques = await getBloques();

    if (exc?.tipo === 'capacidad_reducida') {
      const minimos = bloques.filter(b => ['b1','inicio','cierre'].includes(b.id));
      const prod = minimos.filter(b => TIPO_PROD.includes(b.tipo)).reduce((s,b) => s + b.duracion/60, 0);
      return { tipo:'reducido', produccion:prod, coordinacion:0, comprobacion:0, bloques:minimos };
    }

    // Normal day: last hábil block is recuperacion
    const dow = new Date(fechaStr + 'T12:00:00').getDay();
    const isViernes = dow === 5;
    let bloqFiltrados = bloques;
    if (isViernes) {
      // b4 reserved for recuperation on Fridays (configurable in future)
      bloqFiltrados = bloques.filter(b => b.id !== 'b4');
    }

    const prod = bloques.filter(b => TIPO_PROD.includes(b.tipo)).reduce((s,b) => s + b.duracion/60, 0);
    const coord= bloques.filter(b => TIPO_COORD.includes(b.tipo)).reduce((s,b) => s + b.duracion/60, 0);
    const comp = bloques.filter(b => TIPO_COMP.includes(b.tipo)).reduce((s,b) => s + b.duracion/60, 0);

    const prodAsgn = isViernes
      ? bloqFiltrados.filter(b => TIPO_PROD.includes(b.tipo)).reduce((s,b) => s + b.duracion/60, 0)
      : prod;

    return {
      tipo: 'normal',
      produccion: prodAsgn,
      coordinacion: coord,
      comprobacion: comp,
      produccionTotal: prod,
      bloques,
      isViernes
    };
  }

  async function getCapacidadSemana(fechas) {
    const caps = await Promise.all(fechas.map(f => getCapacidadDia(f)));
    return caps.reduce((acc, c) => ({
      produccion:   acc.produccion   + (c.produccion||0),
      coordinacion: acc.coordinacion + (c.coordinacion||0),
      comprobacion: acc.comprobacion + (c.comprobacion||0),
    }), { produccion:0, coordinacion:0, comprobacion:0 });
  }

  async function getCargaSemana(fechas) {
    const margen = (await DB.getConfig('margenEstimado')) || 1.3;
    const all    = await DB.getAll(DB.S.T);
    const enFechas = all.filter(t => t.fechaAgendada && fechas.includes(t.fechaAgendada) && t.estado !== 'hecha');
    const result   = { produccion:0, coordinacion:0, comprobacion:0, planificacion:0 };
    enFechas.forEach(t => {
      const h = (t.estimadoBase || 0.5) * margen;
      result[t.tipoTrabajo] = (result[t.tipoTrabajo] || 0) + h;
    });
    return result;
  }

  async function getHolguraSemana(fechas) {
    const [cap, carga] = await Promise.all([getCapacidadSemana(fechas), getCargaSemana(fechas)]);
    const totalCap   = cap.produccion + cap.coordinacion + cap.comprobacion;
    const totalCarga = carga.produccion + carga.coordinacion + carga.comprobacion;
    const holgura    = totalCap - totalCarga;
    const pct        = totalCap > 0 ? (holgura / totalCap) * 100 : 0;
    const pctAmbar   = (await DB.getConfig('semaforoPorcentajeAmbar')) || 15;
    return {
      cap, carga,
      totalCap, totalCarga, holgura,
      pct: Math.round(pct),
      semaforo: pct >= pctAmbar ? 'verde' : pct >= 0 ? 'ambar' : 'rojo'
    };
  }

  async function calcAvancePonderado(subproyectoId) {
    const ts = await DB.getByIndex(DB.S.T, 'subproyectoId', subproyectoId);
    const total  = ts.reduce((s,t) => s + (t.estimadoBase||0), 0);
    if (total === 0) return 0;
    const hechas = ts.filter(t => t.estado === 'hecha').reduce((s,t) => s + (t.estimadoBase||0), 0);
    return Math.round((hechas / total) * 100);
  }

  async function calcMargenProyecto(proyecto) {
    if (!proyecto.fechaEntrega) return null;
    const h = Utils.hoy();
    const subs = await DB.getByIndex(DB.S.SP, 'proyectoId', proyecto.id);
    let horasRestantes = 0;
    for (const s of subs) {
      const ts = await DB.getByIndex(DB.S.T, 'subproyectoId', s.id);
      const pendientes = ts.filter(t => !['hecha'].includes(t.estado));
      horasRestantes += pendientes.reduce((sum,t) => sum + (t.estimadoConMargen || (t.estimadoBase||0) * 1.3), 0);
    }
    const bloques   = await getBloques();
    const hxDia     = bloques.filter(b => TIPO_PROD.includes(b.tipo)).reduce((s,b) => s + b.duracion/60, 0);
    const diasNec   = hxDia > 0 ? Math.ceil(horasRestantes / hxDia) : 0;
    const fechaProy = Utils.addDiasHabiles(h, diasNec);
    const marginDias= Utils.diasHabilesDesdeHoy(proyecto.fechaEntrega) - diasNec;
    return {
      horasRestantes: Math.round(horasRestantes * 100)/100,
      diasNecesarios: diasNec,
      fechaProyectada: fechaProy,
      margenDias: marginDias,
      semaforo: marginDias >= 5 ? 'verde' : marginDias >= 2 ? 'ambar' : 'rojo'
    };
  }

  async function verificarConflictosFecha(fechaStr) {
    const conflictos = [];
    if (!fechaStr) return conflictos;
    const cap = await getCapacidadDia(fechaStr);
    if (cap.tipo === 'feriado')   conflictos.push({ tipo:'error',  msg:'Ese día es feriado' });
    if (cap.tipo === 'reducido')  conflictos.push({ tipo:'aviso',  msg:'Día de capacidad reducida' });
    if (cap.tipo === 'libre')     conflictos.push({ tipo:'error',  msg:'Fin de semana sin capacidad' });
    if (cap.isViernes)            conflictos.push({ tipo:'info',   msg:'Viernes: bloque 4 es recuperación' });
    return conflictos;
  }

  async function calibrar() {
    const n   = (await DB.getConfig('calibracionMediana')) || 10;
    const all = await DB.getAll(DB.S.T);
    const hechas = all.filter(t => t.estado === 'hecha' && t.estimadoBase > 0 && t.tiempoReal > 0);
    if (hechas.length < 3) return null;
    const ratios = hechas.slice(-n).map(t => t.tiempoReal / t.estimadoBase).sort((a,b) => a-b);
    const mediana = ratios[Math.floor(ratios.length / 2)];
    const actual  = (await DB.getConfig('margenEstimado')) || 1.3;
    return {
      n: hechas.length,
      mediana: Math.round(mediana * 100)/100,
      actual,
      sugerido: mediana > actual * 1.05 ? Math.round(mediana * 1.1 * 10)/10 : null
    };
  }

  window.Capacidad = {
    getBloques, getCapacidadDia, getCapacidadSemana,
    getCargaSemana, getHolguraSemana,
    calcAvancePonderado, calcMargenProyecto,
    verificarConflictosFecha, calibrar
  };

})(window);
