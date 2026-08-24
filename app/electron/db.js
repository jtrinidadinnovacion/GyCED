const path = require('path');
const { randomUUID } = require('crypto');
const { app } = require('electron');
const Database = require('better-sqlite3');

const dbPath = path.join(app.getPath('userData'), 'local.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS examenes (
    id TEXT PRIMARY KEY,
    titulo TEXT NOT NULL,
    instrucciones TEXT,
    nombre_plantel TEXT,
    nombre_docente TEXT,
    fecha_evaluacion TEXT,
    grupo TEXT,
    nuevo TEXT NOT NULL,
    actualizacion TEXT NOT NULL,
    estado TEXT NOT NULL DEFAULT 'pendiente'
  );

  CREATE TABLE IF NOT EXISTS preguntas (
    id TEXT PRIMARY KEY,
    examen_id TEXT NOT NULL REFERENCES examenes(id) ON DELETE CASCADE,
    tipo TEXT,
    n_preguntas INTEGER NOT NULL DEFAULT 0,
    texto TEXT,
    imagen_data TEXT
  );

  CREATE TABLE IF NOT EXISTS respuestas (
    id TEXT PRIMARY KEY,
    pregunta_id TEXT NOT NULL REFERENCES preguntas(id) ON DELETE CASCADE,
    texto TEXT,
    imagen_data TEXT,
    es_correcta TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_preguntas_examen ON preguntas(examen_id);
  CREATE INDEX IF NOT EXISTS idx_respuestas_pregunta ON respuestas(pregunta_id);
`);

// Migra bases de datos creadas antes de renombrar created_at/updated_at/sync_status.
const columnasExamenes = db.prepare(`PRAGMA table_info(examenes)`).all().map((c) => c.name);
const renombres = [
  ['created_at', 'nuevo'],
  ['updated_at', 'actualizacion'],
  ['sync_status', 'estado'],
];
for (const [antigua, nueva] of renombres) {
  if (columnasExamenes.includes(antigua) && !columnasExamenes.includes(nueva)) {
    db.exec(`ALTER TABLE examenes RENAME COLUMN ${antigua} TO ${nueva}`);
  }
}
// La fecha ahora se guarda solo como YYYY-MM-DD; recorta la hora de registros previos.
db.exec(`
  UPDATE examenes SET nuevo = substr(nuevo, 1, 10) WHERE length(nuevo) > 10;
  UPDATE examenes SET actualizacion = substr(actualizacion, 1, 10) WHERE length(actualizacion) > 10;
`);

// Migra bases de datos con el esquema viejo (una fila por pregunta/respuesta con
// columna 'orden') al nuevo esquema (una fila por examen/pregunta con arreglos en json).
const columnasPreguntas = db.prepare(`PRAGMA table_info(preguntas)`).all().map((c) => c.name);
if (columnasPreguntas.includes('orden')) {
  const migrarPreguntas = db.transaction(() => {
    const preguntasViejas = db.prepare(`SELECT * FROM preguntas ORDER BY examen_id, orden`).all();
    const respuestasViejas = db.prepare(`SELECT * FROM respuestas ORDER BY pregunta_id, orden`).all();

    const respuestasPorPregunta = new Map();
    for (const r of respuestasViejas) {
      if (!respuestasPorPregunta.has(r.pregunta_id)) respuestasPorPregunta.set(r.pregunta_id, []);
      respuestasPorPregunta.get(r.pregunta_id).push(r);
    }

    const preguntasPorExamen = new Map();
    for (const p of preguntasViejas) {
      if (!preguntasPorExamen.has(p.examen_id)) preguntasPorExamen.set(p.examen_id, []);
      preguntasPorExamen.get(p.examen_id).push(p);
    }

    db.exec(`DROP TABLE preguntas; DROP TABLE respuestas;`);
    db.exec(`
      CREATE TABLE preguntas (
        id TEXT PRIMARY KEY,
        examen_id TEXT NOT NULL REFERENCES examenes(id) ON DELETE CASCADE,
        tipo TEXT,
        n_preguntas INTEGER NOT NULL DEFAULT 0,
        texto TEXT,
        imagen_data TEXT
      );
      CREATE TABLE respuestas (
        id TEXT PRIMARY KEY,
        pregunta_id TEXT NOT NULL REFERENCES preguntas(id) ON DELETE CASCADE,
        texto TEXT,
        imagen_data TEXT,
        es_correcta TEXT
      );
    `);

    const insertPregunta = db.prepare(
      `INSERT INTO preguntas (id, examen_id, tipo, n_preguntas, texto, imagen_data) VALUES (?, ?, ?, ?, ?, ?)`
    );
    const insertRespuesta = db.prepare(
      `INSERT INTO respuestas (id, pregunta_id, texto, imagen_data, es_correcta) VALUES (?, ?, ?, ?, ?)`
    );

    for (const [examenId, preguntasExamen] of preguntasPorExamen) {
      const preguntaId = randomUUID();
      insertPregunta.run(
        preguntaId,
        examenId,
        JSON.stringify(preguntasExamen.map((p) => p.tipo)),
        preguntasExamen.length,
        JSON.stringify(preguntasExamen.map((p) => p.texto)),
        JSON.stringify(preguntasExamen.map((p) => p.imagen_data))
      );

      for (const p of preguntasExamen) {
        const respuestasPregunta = respuestasPorPregunta.get(p.id) || [];
        insertRespuesta.run(
          randomUUID(),
          preguntaId,
          JSON.stringify(respuestasPregunta.map((r) => r.texto)),
          JSON.stringify(respuestasPregunta.map((r) => r.imagen_data)),
          JSON.stringify(respuestasPregunta.filter((r) => r.es_correcta).map((r) => r.texto))
        );
      }
    }
  });

  migrarPreguntas();
}

// Recrea los índices por si se perdieron al migrar el esquema de preguntas/respuestas.
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_preguntas_examen ON preguntas(examen_id);
  CREATE INDEX IF NOT EXISTS idx_respuestas_pregunta ON respuestas(pregunta_id);
`);

function parseJsonSeguro(valor, porDefecto) {
  if (!valor) return porDefecto;
  try {
    return JSON.parse(valor);
  } catch {
    return porDefecto;
  }
}

// Migra el contenido de preguntas/respuestas guardado con el formato intermedio
// (arreglos por posición, sin el número de pregunta) al formato final:
// preguntas.texto      = [numero, texto_pregunta, respuesta_correcta, numero, ...]
// respuestas.texto      = [numero_pregunta, opcion1, opcion2, ...]
// respuestas.es_correcta = [numero_pregunta, texto_de_la_opcion_correcta]
const esFormatoIntermedio = (fila) => {
  const arr = parseJsonSeguro(fila.texto, []);
  return arr.length > 0 && typeof arr[0] !== 'number';
};

const filasPreguntasPorMigrar = db.prepare(`SELECT * FROM preguntas`).all().filter(esFormatoIntermedio);
if (filasPreguntasPorMigrar.length > 0) {
  const migrarFormato = db.transaction(() => {
    const updatePregunta = db.prepare(`UPDATE preguntas SET texto = ? WHERE id = ?`);
    const updateRespuesta = db.prepare(`UPDATE respuestas SET texto = ?, es_correcta = ? WHERE id = ?`);

    for (const fila of filasPreguntasPorMigrar) {
      const textos = parseJsonSeguro(fila.texto, []);
      const respuestasFilas = db.prepare(`SELECT * FROM respuestas WHERE pregunta_id = ? ORDER BY rowid`).all(fila.id);

      const nuevoTextoPreguntas = [];
      textos.forEach((texto, indice) => {
        const numero = indice + 1;
        const rFila = respuestasFilas[indice];
        const opciones = rFila ? parseJsonSeguro(rFila.texto, []) : [];
        const correctasViejas = rFila ? parseJsonSeguro(rFila.es_correcta, []) : [];
        const correctaTexto = opciones.find((op) => correctasViejas.includes(op)) ?? null;
        nuevoTextoPreguntas.push(numero, texto ?? null, correctaTexto);

        if (rFila) {
          updateRespuesta.run(
            JSON.stringify([numero, ...opciones]),
            JSON.stringify([numero, correctaTexto]),
            rFila.id
          );
        }
      });

      updatePregunta.run(JSON.stringify(nuevoTextoPreguntas), fila.id);
    }
  });

  migrarFormato();
}

// Migra al formato final:
// - preguntas.tipo: un solo valor para todo el examen, ej. ["opcion_multiple"]
//   (antes se repetía una vez por pregunta).
// - preguntas.texto: pares [numero, texto_pregunta, numero, texto_pregunta, ...]
//   (antes incluía también la respuesta correcta en cada tripleta).
// - respuestas: una sola fila por examen con arreglos anidados por pregunta:
//   texto = [[numero, opcion1, opcion2, ...], ...], es_correcta = [[numero, correcta], ...]
//   (antes había una fila de respuestas por cada pregunta).
function necesitaMigracionV3(filaPreguntas, respuestasFilas) {
  const tipoArr = parseJsonSeguro(filaPreguntas.tipo, []);
  if (tipoArr.length > 1) return true;
  if (respuestasFilas.length > 1) return true;
  if (respuestasFilas.length === 1) {
    const texto = parseJsonSeguro(respuestasFilas[0].texto, []);
    if (texto.length > 0 && !Array.isArray(texto[0])) return true;
  }
  const textoArr = parseJsonSeguro(filaPreguntas.texto, []);
  const n = filaPreguntas.n_preguntas || 0;
  if (n > 0 && textoArr.length === n * 3) return true;
  return false;
}

const filasPreguntasV3 = db.prepare(`SELECT * FROM preguntas`).all();
const migrarV3 = db.transaction(() => {
  const updatePregunta = db.prepare(`UPDATE preguntas SET tipo = ?, texto = ? WHERE id = ?`);
  const deleteRespuestas = db.prepare(`DELETE FROM respuestas WHERE pregunta_id = ?`);
  const insertRespuestaUnica = db.prepare(
    `INSERT INTO respuestas (id, pregunta_id, texto, imagen_data, es_correcta) VALUES (?, ?, ?, ?, ?)`
  );

  for (const fila of filasPreguntasV3) {
    const respuestasFilas = db.prepare(`SELECT * FROM respuestas WHERE pregunta_id = ? ORDER BY rowid`).all(fila.id);
    if (!necesitaMigracionV3(fila, respuestasFilas)) continue;

    const tipoArr = parseJsonSeguro(fila.tipo, []);
    const textoArr = parseJsonSeguro(fila.texto, []);
    const n = fila.n_preguntas || 0;
    const anchoTexto = n > 0 && textoArr.length % n === 0 ? textoArr.length / n : 2;

    const nuevoTextoPreguntas = [];
    for (let i = 0; i < n; i++) {
      nuevoTextoPreguntas.push(i + 1, textoArr[i * anchoTexto + 1] ?? null);
    }

    const textoRespuestasNuevo = [];
    const imagenRespuestasNuevo = [];
    const correctasNuevo = [];

    if (respuestasFilas.length > 1) {
      // una fila vieja por pregunta: texto = [numero, ...opciones], es_correcta = [numero, correcta]
      for (const r of respuestasFilas) {
        textoRespuestasNuevo.push(parseJsonSeguro(r.texto, []));
        const opciones = parseJsonSeguro(r.texto, []);
        imagenRespuestasNuevo.push([opciones[0] ?? null, ...parseJsonSeguro(r.imagen_data, [])]);
        correctasNuevo.push(parseJsonSeguro(r.es_correcta, []));
      }
    } else if (respuestasFilas.length === 1) {
      const r = respuestasFilas[0];
      const texto = parseJsonSeguro(r.texto, []);
      const yaAnidado = texto.length > 0 && Array.isArray(texto[0]);
      if (yaAnidado) {
        textoRespuestasNuevo.push(...texto);
        imagenRespuestasNuevo.push(...parseJsonSeguro(r.imagen_data, []));
        correctasNuevo.push(...parseJsonSeguro(r.es_correcta, []));
      } else {
        textoRespuestasNuevo.push(texto);
        imagenRespuestasNuevo.push([texto[0] ?? null, ...parseJsonSeguro(r.imagen_data, [])]);
        correctasNuevo.push(parseJsonSeguro(r.es_correcta, []));
      }
    }

    if (respuestasFilas.length > 0) {
      deleteRespuestas.run(fila.id);
      insertRespuestaUnica.run(
        randomUUID(),
        fila.id,
        JSON.stringify(textoRespuestasNuevo),
        JSON.stringify(imagenRespuestasNuevo),
        JSON.stringify(correctasNuevo)
      );
    }

    updatePregunta.run(JSON.stringify([tipoArr[0] ?? null]), JSON.stringify(nuevoTextoPreguntas), fila.id);
  }
});

migrarV3();

module.exports = db;
