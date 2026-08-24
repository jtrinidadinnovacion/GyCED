const { randomBytes } = require('crypto');
const db = require('./db');
const { TIPOS_PREGUNTA } = require('./tipos-pregunta');

// Alfabeto sin caracteres ambiguos (sin 0/O, 1/I/L) para que el código sea
// corto y fácil de leer/escribir a mano, en vez de un UUID de 36 caracteres.
const ALFABETO_CODIGO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function generarCodigo(longitud = 8) {
  const bytes = randomBytes(longitud);
  let codigo = '';
  for (let i = 0; i < longitud; i++) {
    codigo += ALFABETO_CODIGO[bytes[i] % ALFABETO_CODIGO.length];
  }
  return codigo;
}

function validar(examen) {
  if (!examen.titulo) throw new Error('El examen requiere un título.');
  for (const p of examen.preguntas || []) {
    if (!TIPOS_PREGUNTA.includes(p.tipo)) {
      throw new Error(`Tipo de pregunta inválido: ${p.tipo}`);
    }
  }
}

/** Fecha actual en formato YYYY-MM-DD, sin hora. */
function fechaHoy() {
  return new Date().toISOString().slice(0, 10);
}

function crear(examen) {
  validar(examen);
  const id = generarCodigo();
  const hoy = fechaHoy();

  const insertar = db.transaction(() => {
    db.prepare(
      `INSERT INTO examenes (id, titulo, instrucciones, nombre_plantel, nombre_docente, fecha_evaluacion, grupo, nuevo, actualizacion, estado)
       VALUES (@id, @titulo, @instrucciones, @nombre_plantel, @nombre_docente, @fecha_evaluacion, @grupo, @nuevo, @actualizacion, 'pendiente')`
    ).run({
      id,
      titulo: examen.titulo,
      instrucciones: examen.instrucciones || null,
      nombre_plantel: examen.nombrePlantel || null,
      nombre_docente: examen.nombreDocente || null,
      fecha_evaluacion: examen.fechaEvaluacion || null,
      grupo: examen.grupo || null,
      nuevo: hoy,
      actualizacion: hoy,
    });

    insertarPreguntas(id, examen.preguntas || []);
  });

  insertar();
  return { id };
}

function actualizar(id, examen) {
  validar(examen);
  const hoy = fechaHoy();

  const ejecutarActualizacion = db.transaction(() => {
    const resultado = db
      .prepare(
        `UPDATE examenes
         SET titulo = @titulo, instrucciones = @instrucciones, nombre_plantel = @nombre_plantel,
             nombre_docente = @nombre_docente, fecha_evaluacion = @fecha_evaluacion, grupo = @grupo,
             actualizacion = @actualizacion, estado = 'pendiente'
         WHERE id = @id`
      )
      .run({
        id,
        titulo: examen.titulo,
        instrucciones: examen.instrucciones || null,
        nombre_plantel: examen.nombrePlantel || null,
        nombre_docente: examen.nombreDocente || null,
        fecha_evaluacion: examen.fechaEvaluacion || null,
        grupo: examen.grupo || null,
        actualizacion: hoy,
      });

    if (resultado.changes === 0) {
      throw new Error(`No existe un examen con id ${id}.`);
    }

    db.prepare(`DELETE FROM preguntas WHERE examen_id = ?`).run(id);
    insertarPreguntas(id, examen.preguntas || []);
  });

  ejecutarActualizacion();
  return { id };
}

/** Guarda todas las preguntas de un examen en una sola fila de 'preguntas' y una
 *  sola fila de 'respuestas'. Todo el examen comparte un solo tipo de pregunta
 *  (se elige una vez para todo el examen), por eso 'tipo' guarda un único valor:
 *  - preguntas.tipo: [tipo_de_examen]
 *  - preguntas.texto: [numero, texto_pregunta, numero, texto_pregunta, ...]
 *  - respuestas.texto: [[numero, opcion1, opcion2, ...], [numero, opcion1, ...], ...]
 *  - respuestas.es_correcta: [[numero, texto_correcta], [numero, texto_correcta], ...] */
function insertarPreguntas(examenId, preguntas) {
  if (preguntas.length === 0) return;

  const preguntaId = generarCodigo();
  const textoPreguntas = [];
  const textoRespuestas = [];
  const imagenRespuestas = [];
  const correctas = [];

  preguntas.forEach((pregunta, indice) => {
    const numero = indice + 1;
    const respuestas = pregunta.respuestas || [];
    const correcta = respuestas.find((r) => r.esCorrecta);

    textoPreguntas.push(numero, pregunta.texto || null);
    textoRespuestas.push([numero, ...respuestas.map((r) => r.texto || null)]);
    imagenRespuestas.push([numero, ...respuestas.map((r) => r.imagenData || null)]);
    correctas.push([numero, correcta ? correcta.texto : null]);
  });

  db.prepare(
    `INSERT INTO preguntas (id, examen_id, tipo, n_preguntas, texto, imagen_data) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    preguntaId,
    examenId,
    JSON.stringify([preguntas[0].tipo]),
    preguntas.length,
    JSON.stringify(textoPreguntas),
    JSON.stringify(preguntas.map((p) => p.imagenData || null))
  );

  db.prepare(
    `INSERT INTO respuestas (id, pregunta_id, texto, imagen_data, es_correcta) VALUES (?, ?, ?, ?, ?)`
  ).run(generarCodigo(), preguntaId, JSON.stringify(textoRespuestas), JSON.stringify(imagenRespuestas), JSON.stringify(correctas));
}

function listar() {
  const examenes = db.prepare(`SELECT * FROM examenes ORDER BY nuevo DESC`).all();
  return examenes.map(mapExamen);
}

function obtener(id) {
  const examen = db.prepare(`SELECT * FROM examenes WHERE id = ?`).get(id);
  return examen ? mapExamen(examen) : null;
}

function parseJson(valor, porDefecto) {
  if (!valor) return porDefecto;
  try {
    return JSON.parse(valor);
  } catch {
    return porDefecto;
  }
}

function mapExamen(examen) {
  const fila = db.prepare(`SELECT * FROM preguntas WHERE examen_id = ? LIMIT 1`).get(examen.id);
  let preguntas = [];

  if (fila) {
    const tipoExamen = parseJson(fila.tipo, [])[0];
    const imagenes = parseJson(fila.imagen_data, []);
    const textoPreguntas = parseJson(fila.texto, []); // [numero, texto, numero, texto, ...]
    const filaRespuestas = db.prepare(`SELECT * FROM respuestas WHERE pregunta_id = ?`).get(fila.id);
    const textoRespuestas = filaRespuestas ? parseJson(filaRespuestas.texto, []) : []; // [[numero, opcion1, ...], ...]
    const imagenRespuestas = filaRespuestas ? parseJson(filaRespuestas.imagen_data, []) : [];
    const correctas = filaRespuestas ? parseJson(filaRespuestas.es_correcta, []) : []; // [[numero, correcta], ...]

    preguntas = Array.from({ length: fila.n_preguntas }, (_, indice) => {
      const texto = textoPreguntas[indice * 2 + 1];
      const [, ...opciones] = textoRespuestas[indice] || [];
      const [, ...opcionesImagenes] = imagenRespuestas[indice] || [];
      const [, textoCorrecta] = correctas[indice] || [];

      return {
        tipo: tipoExamen,
        texto,
        imagenData: imagenes[indice] ?? null,
        respuestas: opciones.map((rTexto, rIndice) => ({
          texto: rTexto,
          imagenData: opcionesImagenes[rIndice] ?? null,
          esCorrecta: rTexto === textoCorrecta,
        })),
      };
    });
  }

  return {
    id: examen.id,
    titulo: examen.titulo,
    instrucciones: examen.instrucciones,
    nombrePlantel: examen.nombre_plantel,
    nombreDocente: examen.nombre_docente,
    fechaEvaluacion: examen.fecha_evaluacion,
    grupo: examen.grupo,
    nuevo: examen.nuevo,
    actualizacion: examen.actualizacion,
    estado: examen.estado,
    preguntas,
  };
}

function eliminar(id) {
  db.prepare(`DELETE FROM examenes WHERE id = ?`).run(id);
}

function marcarSincronizado(id) {
  db.prepare(`UPDATE examenes SET estado = 'sincronizado' WHERE id = ?`).run(id);
}

function marcarError(id) {
  db.prepare(`UPDATE examenes SET estado = 'error' WHERE id = ?`).run(id);
}

function pendientes() {
  return db.prepare(`SELECT id FROM examenes WHERE estado = 'pendiente'`).all();
}

module.exports = { crear, actualizar, listar, obtener, eliminar, marcarSincronizado, marcarError, pendientes, mapExamen };
