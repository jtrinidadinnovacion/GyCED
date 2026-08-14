const express = require('express');
const { randomUUID } = require('crypto');
const { pool } = require('../db');

const router = express.Router();

router.post('/', async (req, res) => {
  const examen = req.body;

  if (!examen || !examen.id || !examen.titulo) {
    return res.status(400).json({ error: 'El examen requiere id (UUID generado en el cliente) y título.' });
  }

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    await conn.query(
      `INSERT INTO examenes (id, titulo, instrucciones, nombre_plantel, nombre_docente, fecha_evaluacion, grupo)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         titulo = VALUES(titulo), instrucciones = VALUES(instrucciones), nombre_plantel = VALUES(nombre_plantel),
         nombre_docente = VALUES(nombre_docente), fecha_evaluacion = VALUES(fecha_evaluacion), grupo = VALUES(grupo)`,
      [
        examen.id,
        examen.titulo,
        examen.instrucciones || null,
        examen.nombrePlantel || null,
        examen.nombreDocente || null,
        examen.fechaEvaluacion || null,
        examen.grupo || null,
      ]
    );

    await conn.query(`DELETE FROM preguntas WHERE examen_id = ?`, [examen.id]);

    for (const [index, pregunta] of (examen.preguntas || []).entries()) {
      const preguntaId = randomUUID();

      await conn.query(
        `INSERT INTO preguntas (id, examen_id, tipo, orden, texto, imagen_data) VALUES (?, ?, ?, ?, ?, ?)`,
        [preguntaId, examen.id, pregunta.tipo, index, pregunta.texto || null, pregunta.imagenData || null]
      );

      for (const [rIndex, respuesta] of (pregunta.respuestas || []).entries()) {
        await conn.query(
          `INSERT INTO respuestas (id, pregunta_id, texto, imagen_data, es_correcta, orden) VALUES (?, ?, ?, ?, ?, ?)`,
          [randomUUID(), preguntaId, respuesta.texto || null, respuesta.imagenData || null, !!respuesta.esCorrecta, rIndex]
        );
      }
    }

    await conn.commit();
    res.status(201).json({ id: examen.id });
  } catch (err) {
    await conn.rollback();
    console.error('Error guardando examen:', err);
    res.status(500).json({ error: 'Error guardando el examen.' });
  } finally {
    conn.release();
  }
});

router.get('/', async (_req, res) => {
  try {
    const [examenes] = await pool.query('SELECT * FROM examenes ORDER BY created_at DESC');
    const [preguntas] = await pool.query('SELECT * FROM preguntas ORDER BY orden');
    const [respuestas] = await pool.query('SELECT * FROM respuestas ORDER BY orden');

    const result = examenes.map((examen) => ({
      id: examen.id,
      titulo: examen.titulo,
      instrucciones: examen.instrucciones,
      nombrePlantel: examen.nombre_plantel,
      nombreDocente: examen.nombre_docente,
      fechaEvaluacion: examen.fecha_evaluacion,
      grupo: examen.grupo,
      createdAt: examen.created_at,
      preguntas: preguntas
        .filter((p) => p.examen_id === examen.id)
        .map((p) => ({
          id: p.id,
          tipo: p.tipo,
          orden: p.orden,
          texto: p.texto,
          imagenData: p.imagen_data,
          respuestas: respuestas
            .filter((r) => r.pregunta_id === p.id)
            .map((r) => ({ id: r.id, texto: r.texto, imagenData: r.imagen_data, esCorrecta: !!r.es_correcta, orden: r.orden })),
        })),
    }));

    res.json(result);
  } catch (err) {
    console.error('Error listando examenes:', err);
    res.status(500).json({ error: 'Error listando examenes.' });
  }
});

module.exports = router;
