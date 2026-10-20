(function(window) {
  'use strict';

  const PLANTILLAS = {
    elaboracion: {
      label: 'Elaboración (nuevo)',
      horasBase: 14,
      tareas: [
        { nombre:'Revisión del syllabus y materiales existentes',
          tipoTrabajo:'planificacion', demandaCognitiva:'alta', estimadoBase:1,
          primerPaso:'Abrir el syllabus y leer solo los aprendizajes esperados (10 min)',
          terminadoCuando:'Tengo claro qué materiales existen y qué falta por crear' },
        { nombre:'Contacto inicial con docente',
          tipoTrabajo:'coordinacion', demandaCognitiva:'media', estimadoBase:0.5,
          primerPaso:'Redactar el mensaje de contacto usando la plantilla',
          terminadoCuando:'El mensaje está enviado y registrado en el historial' },
        { nombre:'Espera de respuesta docente (4 días hábiles)',
          tipoTrabajo:'coordinacion', demandaCognitiva:'mecanica', estimadoBase:0,
          primerPaso:'Revisar si llegó respuesta en el correo',
          terminadoCuando:'Llegó la respuesta del docente',
          esEspera: true },
        { nombre:'Reunión inicial con docente',
          tipoTrabajo:'coordinacion', demandaCognitiva:'alta', estimadoBase:1,
          primerPaso:'Preparar las 3 preguntas clave para la reunión',
          terminadoCuando:'Tengo la validación del enfoque, los insumos acordados y el siguiente paso definido' },
        { nombre:'Elaboración del programa de la asignatura',
          tipoTrabajo:'produccion', demandaCognitiva:'alta', estimadoBase:3,
          primerPaso:'Abrir la plantilla del programa y llenar solo el encabezado y los aprendizajes esperados',
          terminadoCuando:'El programa está completo, coherente con los aprendizajes y listo para revisión' },
        { nombre:'Elaboración ME 1',
          tipoTrabajo:'produccion', demandaCognitiva:'alta', estimadoBase:2.5,
          primerPaso:'Definir el objetivo de aprendizaje específico de esta ME en una oración',
          terminadoCuando:'La ME 1 está completa con actividades, recursos y evaluación, lista para revisión del docente' },
        { nombre:'Elaboración ME 2',
          tipoTrabajo:'produccion', demandaCognitiva:'alta', estimadoBase:2.5,
          primerPaso:'Revisar la ME 1 para mantener coherencia y definir el objetivo de la ME 2',
          terminadoCuando:'La ME 2 está completa y lista para revisión del docente' },
        { nombre:'Elaboración ME 3',
          tipoTrabajo:'produccion', demandaCognitiva:'alta', estimadoBase:2.5,
          primerPaso:'Revisar las MEs anteriores para mantener coherencia y definir el objetivo de la ME 3',
          terminadoCuando:'La ME 3 está completa y lista para revisión del docente' },
        { nombre:'Envío de materiales al docente para feedback',
          tipoTrabajo:'coordinacion', demandaCognitiva:'mecanica', estimadoBase:0.25,
          primerPaso:'Comprimir los archivos en una carpeta con el nombre del curso',
          terminadoCuando:'Los archivos están enviados al docente y anotado en el registro de coordinación' },
        { nombre:'Espera de feedback del docente (4 días hábiles)',
          tipoTrabajo:'coordinacion', demandaCognitiva:'mecanica', estimadoBase:0,
          primerPaso:'Revisar si llegó el feedback en el correo',
          terminadoCuando:'Llegó el feedback del docente',
          esEspera: true },
        { nombre:'Ajustes post-feedback',
          tipoTrabajo:'produccion', demandaCognitiva:'media', estimadoBase:2,
          primerPaso:'Leer el feedback completo y hacer una lista numerada de cambios (5 min)',
          terminadoCuando:'Todos los cambios del feedback están implementados y revisados' },
        { nombre:'Checklist de entrega (4 archivos)',
          tipoTrabajo:'comprobacion', demandaCognitiva:'mecanica', estimadoBase:0.25,
          primerPaso:'Abrir la carpeta del curso y verificar cada uno de los 4 archivos',
          terminadoCuando:'Los 4 archivos están completos, nombrados correctamente y listos para subir al aula' },
      ]
    },

    replica: {
      label: 'Réplica (adaptar existente)',
      horasBase: 7,
      tareas: [
        { nombre:'Revisión del material base a adaptar',
          tipoTrabajo:'planificacion', demandaCognitiva:'alta', estimadoBase:0.5,
          primerPaso:'Abrir el material base y revisar qué elementos necesitan adaptación',
          terminadoCuando:'Tengo una lista clara de lo que cambia y lo que se mantiene' },
        { nombre:'Contacto con docente para validación del contexto',
          tipoTrabajo:'coordinacion', demandaCognitiva:'media', estimadoBase:0.25,
          primerPaso:'Redactar el mensaje con las preguntas de validación específicas para la adaptación',
          terminadoCuando:'El mensaje está enviado al docente' },
        { nombre:'Espera de respuesta docente (4 días hábiles)',
          tipoTrabajo:'coordinacion', demandaCognitiva:'mecanica', estimadoBase:0,
          primerPaso:'Revisar si llegó respuesta',
          terminadoCuando:'Llegó la respuesta del docente',
          esEspera: true },
        { nombre:'Adaptación del programa',
          tipoTrabajo:'produccion', demandaCognitiva:'media', estimadoBase:1,
          primerPaso:'Abrir el programa base y el contexto nuevo en paralelo; identificar los 3 principales cambios',
          terminadoCuando:'El programa está adaptado al nuevo contexto y revisado' },
        { nombre:'Adaptación ME 1',
          tipoTrabajo:'produccion', demandaCognitiva:'media', estimadoBase:1.5,
          primerPaso:'Abrir la ME base y marcar con color los elementos a cambiar',
          terminadoCuando:'La ME 1 adaptada está lista para envío al docente' },
        { nombre:'Adaptación ME 2',
          tipoTrabajo:'produccion', demandaCognitiva:'media', estimadoBase:1.5,
          primerPaso:'Abrir la ME 2 base y revisar los cambios necesarios a partir de la adaptación de la ME 1',
          terminadoCuando:'La ME 2 adaptada está lista para envío' },
        { nombre:'Adaptación ME 3',
          tipoTrabajo:'produccion', demandaCognitiva:'media', estimadoBase:1.5,
          primerPaso:'Abrir la ME 3 base con los cambios ya identificados',
          terminadoCuando:'La ME 3 adaptada está lista para envío' },
        { nombre:'Envío al docente y espera de feedback',
          tipoTrabajo:'coordinacion', demandaCognitiva:'mecanica', estimadoBase:0.25,
          primerPaso:'Comprimir y enviar los archivos adaptados',
          terminadoCuando:'Archivos enviados y registrados' },
        { nombre:'Ajustes finales',
          tipoTrabajo:'produccion', demandaCognitiva:'media', estimadoBase:1,
          primerPaso:'Leer el feedback y hacer la lista de cambios pendientes',
          terminadoCuando:'Cambios implementados y revisados' },
        { nombre:'Checklist de entrega (4 archivos)',
          tipoTrabajo:'comprobacion', demandaCognitiva:'mecanica', estimadoBase:0.25,
          primerPaso:'Verificar los 4 archivos en la carpeta de entrega',
          terminadoCuando:'Los 4 archivos están listos para subir al aula' },
      ]
    },

    reutilizar: {
      label: 'Reutilizar (sin cambios)',
      horasBase: 1.5,
      tareas: [
        { nombre:'Verificar vigencia del material',
          tipoTrabajo:'comprobacion', demandaCognitiva:'media', estimadoBase:0.5,
          primerPaso:'Abrir el material del ciclo anterior y revisar si el contexto cambió',
          terminadoCuando:'Confirmado: el material no necesita cambios y está vigente' },
        { nombre:'Confirmación con docente',
          tipoTrabajo:'coordinacion', demandaCognitiva:'mecanica', estimadoBase:0.25,
          primerPaso:'Enviar mensaje de confirmación al docente indicando que se reutilizará el material',
          terminadoCuando:'Docente confirmó que el material sirve sin cambios' },
        { nombre:'Checklist de entrega (4 archivos)',
          tipoTrabajo:'comprobacion', demandaCognitiva:'mecanica', estimadoBase:0.25,
          primerPaso:'Verificar que los 4 archivos del ciclo anterior están disponibles y nombrados correctamente',
          terminadoCuando:'Los 4 archivos están listos para subir al aula' },
        { nombre:'Preparación de la carpeta de entrega',
          tipoTrabajo:'comprobacion', demandaCognitiva:'mecanica', estimadoBase:0.5,
          primerPaso:'Copiar los archivos a la carpeta de entrega del bimestre actual',
          terminadoCuando:'La carpeta de entrega está organizada y lista' },
      ]
    },

    comprobacion: {
      label: 'Comprobación (checklist)',
      horasBase: 0.5,
      tareas: [
        { nombre:'Verificar archivo 1',
          tipoTrabajo:'comprobacion', demandaCognitiva:'mecanica', estimadoBase:0.1,
          primerPaso:'Abrir el archivo y revisar que está completo',
          terminadoCuando:'Archivo 1 verificado y listo' },
        { nombre:'Verificar archivo 2',
          tipoTrabajo:'comprobacion', demandaCognitiva:'mecanica', estimadoBase:0.1,
          primerPaso:'Abrir el archivo 2 y revisar que está completo',
          terminadoCuando:'Archivo 2 verificado y listo' },
        { nombre:'Verificar archivo 3',
          tipoTrabajo:'comprobacion', demandaCognitiva:'mecanica', estimadoBase:0.1,
          primerPaso:'Abrir el archivo 3 y revisar que está completo',
          terminadoCuando:'Archivo 3 verificado y listo' },
        { nombre:'Verificar archivo 4',
          tipoTrabajo:'comprobacion', demandaCognitiva:'mecanica', estimadoBase:0.1,
          primerPaso:'Abrir el archivo 4 y revisar que está completo',
          terminadoCuando:'Archivo 4 verificado y listo' },
        { nombre:'Confirmación final',
          tipoTrabajo:'comprobacion', demandaCognitiva:'mecanica', estimadoBase:0.1,
          primerPaso:'Revisar que los 4 archivos están en la carpeta correcta con los nombres correctos',
          terminadoCuando:'Los 4 archivos están verificados y listos para entrega' },
      ]
    }
  };

  async function crearDesdePlantilla(tipoPlantilla, subproyectoId, fechaInicio) {
    const plantilla = PLANTILLAS[tipoPlantilla];
    if (!plantilla) throw new Error('Plantilla desconocida: ' + tipoPlantilla);

    const margen = (await DB.getConfig('margenEstimado')) || 1.3;
    const creadas = [];

    for (const def of plantilla.tareas) {
      const tarea = {
        subproyectoId,
        nombre:         def.nombre,
        tipoTrabajo:    def.tipoTrabajo,
        demandaCognitiva: def.demandaCognitiva,
        primerPaso:     def.primerPaso,
        terminadoCuando: def.terminadoCuando,
        estimadoBase:   def.estimadoBase,
        estimadoConMargen: Math.round(def.estimadoBase * margen * 100)/100,
        estado:         'por_hacer',
        fechaAgendada:  null,
        bloqueAsignado: null,
        tiempoReal:     null,
        esperandoA:     def.esEspera ? '' : null,
        esperandoHasta: def.esEspera ? '' : null,
      };
      const saved = await DB.put(DB.S.T, tarea);
      creadas.push(saved);
    }
    return creadas;
  }

  window.Plantillas = {
    PLANTILLAS,
    crearDesdePlantilla,
    getLabel: (t) => PLANTILLAS[t]?.label || t,
    getHorasBase: (t) => PLANTILLAS[t]?.horasBase || 0,
    getTipos: () => Object.keys(PLANTILLAS)
  };

})(window);
