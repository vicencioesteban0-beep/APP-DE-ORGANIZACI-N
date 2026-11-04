(function(window) {
  'use strict';

  const DB_NAME = 'PlanificadorDB';
  const DB_VERSION = 2;
  let _db = null;

  function openDB() {
    return new Promise((resolve, reject) => {
      if (_db) { resolve(_db); return; }
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => { _db = req.result; resolve(_db); };
      req.onupgradeneeded = (e) => {
        const db = e.target.result;

        const makeStore = (name, indexes = []) => {
          if (db.objectStoreNames.contains(name)) return;
          const s = db.createObjectStore(name, { keyPath: 'id' });
          indexes.forEach(idx => s.createIndex(idx, idx, { unique: false }));
        };
        const makeKV = (name) => {
          if (!db.objectStoreNames.contains(name))
            db.createObjectStore(name, { keyPath: 'clave' });
        };

        makeStore('proyectos',    ['estado', 'fechaEntrega']);
        makeStore('subproyectos', ['proyectoId', 'estado', 'colaboradorId', 'loteId', 'etapa']);
        makeStore('tareas',       ['subproyectoId', 'estado', 'fechaAgendada', 'tipoTrabajo', 'demandaCognitiva']);
        makeStore('colaboradores',['nombre']);
        makeStore('lotes',        ['fecha']);
        makeStore('bloques',      ['tipo']);
        makeStore('excepciones',  ['fecha', 'tipo']);
        makeStore('metricas',     ['fecha', 'tipo']);
        makeStore('notas',        ['proyectoId', 'fijada', 'plantilla']);
        makeKV('config');
      };
    });
  }

  function genId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID)
      return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  function p(req) {
    return new Promise((res, rej) => {
      req.onsuccess = () => res(req.result);
      req.onerror  = () => rej(req.error);
    });
  }

  async function _s(name, mode) {
    const db = await openDB();
    return db.transaction(name, mode).objectStore(name);
  }

  async function getAll(store) {
    return p((await _s(store, 'readonly')).getAll());
  }

  async function getById(store, id) {
    return p((await _s(store, 'readonly')).get(id));
  }

  async function getByIndex(store, idx, val) {
    const s = await _s(store, 'readonly');
    return p(s.index(idx).getAll(val));
  }

  async function put(store, data) {
    const now = new Date().toISOString();
    const rec = { createdAt: now, ...data, updatedAt: now };
    if (!rec.id) rec.id = genId();
    await p((await _s(store, 'readwrite')).put(rec));
    return rec;
  }

  async function remove(store, id) {
    return p((await _s(store, 'readwrite')).delete(id));
  }

  async function getConfig(clave) {
    const db = await openDB();
    return new Promise(res => {
      const req = db.transaction('config', 'readonly').objectStore('config').get(clave);
      req.onsuccess = () => res(req.result?.valor);
      req.onerror   = () => res(undefined);
    });
  }

  async function setConfig(clave, valor) {
    const db = await openDB();
    return p(db.transaction('config', 'readwrite').objectStore('config').put({ clave, valor }));
  }

  /* ── Specialized queries ── */

  async function getTareasParaHoy(fechaStr) {
    const all = await getAll('tareas');
    return all.filter(t =>
      (t.fechaAgendada === fechaStr && ['agendada','en_curso','por_hacer'].includes(t.estado)) ||
      t.estado === 'en_curso'
    );
  }

  async function getTareasPorReplantear() {
    const hoy = new Date().toISOString().split('T')[0];
    const all = await getAll('tareas');
    return all.filter(t =>
      t.estado === 'por_replantear' ||
      (t.fechaAgendada && t.fechaAgendada < hoy && !['hecha','por_replantear'].includes(t.estado))
    );
  }

  async function getEsperandosVencidos() {
    const hoy = new Date().toISOString().split('T')[0];
    const all = await getAll('tareas');
    return all.filter(t =>
      t.estado === 'esperando' &&
      t.esperandoHasta &&
      t.esperandoHasta <= hoy
    );
  }

  /* ── Default data ── */

  const BLOQUES_DEFAULT = [
    { id:'inicio', nombre:'Inicio del día',  inicio:'09:00', fin:'09:10', tipo:'rutina',          duracion:10,  orden:0 },
    { id:'b1',     nombre:'Bloque 1',         inicio:'09:10', fin:'11:00', tipo:'produccion_alta', duracion:110, orden:1 },
    { id:'pausa1', nombre:'Pausa',            inicio:'11:00', fin:'11:15', tipo:'pausa',           duracion:15,  orden:2 },
    { id:'b2',     nombre:'Bloque 2',         inicio:'11:15', fin:'13:00', tipo:'produccion_alta', duracion:105, orden:3 },
    { id:'b3',     nombre:'Bloque 3',         inicio:'13:00', fin:'14:00', tipo:'coordinacion',    duracion:60,  orden:4 },
    { id:'almuerzo',nombre:'Almuerzo',        inicio:'14:00', fin:'15:00', tipo:'pausa',           duracion:60,  orden:5 },
    { id:'b4',     nombre:'Bloque 4',         inicio:'15:00', fin:'16:45', tipo:'produccion_media',duracion:105, orden:6 },
    { id:'b5',     nombre:'Bloque 5',         inicio:'16:45', fin:'17:30', tipo:'comprobacion',    duracion:45,  orden:7 },
    { id:'margen', nombre:'Margen',           inicio:'17:30', fin:'17:50', tipo:'margen',          duracion:20,  orden:8 },
    { id:'cierre', nombre:'Cierre del día',   inicio:'17:50', fin:'18:00', tipo:'rutina',          duracion:10,  orden:9 },
  ];

  async function init() {
    await openDB();

    // Seed default blocks
    const existing = await getAll('bloques');
    if (existing.length === 0) {
      for (const b of BLOQUES_DEFAULT)
        await p((await _s('bloques', 'readwrite')).put({ ...b, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }));
    }

    // Seed default config
    if (await getConfig('margenEstimado') === undefined) {
      await setConfig('margenEstimado', 1.3);
      await setConfig('horaInicioObjetivo', '09:10');
      await setConfig('maxSubproyectosDia', 2);
      await setConfig('semaforoPorcentajeAmbar', 15);
      await setConfig('calibracionMediana', 10);
      await setConfig('tema', 'auto');
    }

    // Move stale agendadas → por_replantear
    const hoy = new Date().toISOString().split('T')[0];
    const all = await getAll('tareas');
    for (const t of all) {
      if (t.fechaAgendada && t.fechaAgendada < hoy && t.estado === 'agendada') {
        await put('tareas', { ...t, estado: 'por_replantear' });
      }
    }
  }

  async function buscarNotas(query) {
    const all = await getAll('notas');
    if (!query) return all;
    const q = query.toLowerCase();
    return all.filter(n =>
      (n.titulo || '').toLowerCase().includes(q) ||
      (n.contenido || '').toLowerCase().includes(q) ||
      (n.tags || []).some(t => t.toLowerCase().includes(q))
    );
  }

  window.DB = {
    init, genId,
    getAll, getById, getByIndex,
    put, remove,
    getConfig, setConfig,
    getTareasParaHoy,
    getTareasPorReplantear,
    getEsperandosVencidos,
    buscarNotas,
    BLOQUES_DEFAULT,
    S: { P:'proyectos', SP:'subproyectos', T:'tareas', C:'colaboradores', L:'lotes', B:'bloques', E:'excepciones', M:'metricas', N:'notas' }
  };

})(window);
