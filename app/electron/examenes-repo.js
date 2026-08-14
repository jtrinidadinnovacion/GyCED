const { randomUUID } = require('crypto');
const db = require('./db');
const { TIPOS_PREGUNTA } = require('./tipos-pregunta');

function validar(examen) {
  if (!examen.titulo) throw new Error('El examen requiere un título.');
  for (const p of examen.preguntas || []) {
    if (!TIPOS_PREGUNTA.includes(p.tipo)) {
      throw new Error(`Tipo de pregunta inválido: ${p.tipo}`);
    }
  }
}

function crear(examen) {
  validar(examen);
  const id = randomUUID();
  const now = new Date().toISOString();

  const insertar = db.transaction(() => {
    db.prepare(
      `INSERT INTO examenes (id, titulo, instrucciones, nombre_plantel, nombre_docente, fecha_evaluacion, grupo, created_at, updated_at, sync_status)
       VALUES (@id, @titulo, @instrucciones, @nombre_plantel, @nombre_docente, @fecha_evaluacion, @grupo, @created_at, @updated_at, 'pendiente')`
    ).run({
      id,
      titulo: examen.titulo,
      instrucciones: examen.instrucciones || null,
      nombre_plantel: examen.nombrePlantel || null,
      nombre_docente: examen.nombreDocente || null,
      fecha_evaluacion: examen.fechaEvaluacion || null,
      grupo: examen.grupo || null,
      created_at: now,
      updated_at: now,
    });

    insertarPreguntas(id, examen.preguntas || []);
  });

  insertar();
  return { id };
}

function insertarPreguntas(examenId, preguntas) {
  const insertPregunta = db.prepare(
    `INSERT INTO preguntas (id, examen_id, tipo, orden, texto, imagen_data) VALUES (?, ?, ?, ?, ?, ?)`
  );
  const insertRespuesta = db.prepare(
    `INSERT INTO respuestas (id, pregunta_id, texto, imagen_data, es_correcta, orden) VALUES (?, ?, ?, ?, ?, ?)`
  );

  preguntas.forEach((pregunta, index) => {
    const preguntaId = randomUUID();
    insertPregunta.run(preguntaId, examenId, pregunta.tipo, index, pregunta.texto || null, pregunta.imagenData || null);

    (pregunta.respuestas || []).forEach((respuesta, rIndex) => {
      insertRespuesta.run(
        randomUUID(),
        preguntaId,
        respuesta.texto || null,
        respuesta.imagenData || null,
        respuesta.esCorrecta ? 1 : 0,
        rIndex
      );
    });
  });
}

function listar() {
  const examenes = db.prepare(`SELECT * FROM examenes ORDER BY created_at DESC`).all();
  return examenes.map(mapExamen);
}

function obtener(id) {
  const examen = db.prepare(`SELECT * FROM examenes WHERE id = ?`).get(id);
  return examen ? mapExamen(examen) : null;
}

function mapExamen(examen) {
  const preguntas = db.prepare(`SELECT * FROM preguntas WHERE examen_id = ? ORDER BY orden`).all(examen.id);

  return {
    id: examen.id,
    titulo: examen.titulo,
    instrucciones: examen.instrucciones,
    nombrePlantel: examen.nombre_plantel,
    nombreDocente: examen.nombre_docente,
    fechaEvaluacion: examen.fecha_evaluacion,
    grupo: examen.grupo,
    createdAt: examen.created_at,
    updatedAt: examen.updated_at,
    syncStatus: examen.sync_status,
    preguntas: preguntas.map((p) => ({
      id: p.id,
      tipo: p.tipo,
      orden: p.orden,
      texto: p.texto,
      imagenData: p.imagen_data,
      respuestas: db
        .prepare(`SELECT * FROM respuestas WHERE pregunta_id = ? ORDER BY orden`)
        .all(p.id)
        .map((r) => ({
          id: r.id,
          texto: r.texto,
          imagenData: r.imagen_data,
          esCorrecta: !!r.es_correcta,
          orden: r.orden,
        })),
    })),
  };
}

function eliminar(id) {
  db.prepare(`DELETE FROM examenes WHERE id = ?`).run(id);
}

function marcarSincronizado(id) {
  db.prepare(`UPDATE examenes SET sync_status = 'sincronizado' WHERE id = ?`).run(id);
}

function marcarError(id) {
  db.prepare(`UPDATE examenes SET sync_status = 'error' WHERE id = ?`).run(id);
}

function pendientes() {
  return db.prepare(`SELECT id FROM examenes WHERE sync_status = 'pendiente'`).all();
}

module.exports = { crear, listar, obtener, eliminar, marcarSincronizado, marcarError, pendientes, mapExamen };
