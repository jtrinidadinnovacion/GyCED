const path = require('path');
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
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    sync_status TEXT NOT NULL DEFAULT 'pendiente'
  );

  CREATE TABLE IF NOT EXISTS preguntas (
    id TEXT PRIMARY KEY,
    examen_id TEXT NOT NULL REFERENCES examenes(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL,
    orden INTEGER NOT NULL DEFAULT 0,
    texto TEXT,
    imagen_data TEXT
  );

  CREATE TABLE IF NOT EXISTS respuestas (
    id TEXT PRIMARY KEY,
    pregunta_id TEXT NOT NULL REFERENCES preguntas(id) ON DELETE CASCADE,
    texto TEXT,
    imagen_data TEXT,
    es_correcta INTEGER NOT NULL DEFAULT 0,
    orden INTEGER NOT NULL DEFAULT 0
  );

  CREATE INDEX IF NOT EXISTS idx_preguntas_examen ON preguntas(examen_id);
  CREATE INDEX IF NOT EXISTS idx_respuestas_pregunta ON respuestas(pregunta_id);
`);

module.exports = db;
