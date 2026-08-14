CREATE DATABASE IF NOT EXISTS gyced;
USE gyced;

CREATE TABLE IF NOT EXISTS examenes (
  id CHAR(36) PRIMARY KEY,
  titulo VARCHAR(255) NOT NULL,
  instrucciones TEXT NULL,
  nombre_plantel VARCHAR(255) NULL,
  nombre_docente VARCHAR(255) NULL,
  fecha_evaluacion DATE NULL,
  grupo VARCHAR(100) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS preguntas (
  id CHAR(36) PRIMARY KEY,
  examen_id CHAR(36) NOT NULL,
  tipo VARCHAR(30) NOT NULL,
  orden INT NOT NULL DEFAULT 0,
  texto TEXT NULL,
  imagen_data LONGTEXT NULL,
  CONSTRAINT fk_preguntas_examen FOREIGN KEY (examen_id) REFERENCES examenes(id) ON DELETE CASCADE,
  INDEX idx_preguntas_examen (examen_id)
);

CREATE TABLE IF NOT EXISTS respuestas (
  id CHAR(36) PRIMARY KEY,
  pregunta_id CHAR(36) NOT NULL,
  texto TEXT NULL,
  imagen_data LONGTEXT NULL,
  es_correcta TINYINT(1) NOT NULL DEFAULT 0,
  orden INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_respuestas_pregunta FOREIGN KEY (pregunta_id) REFERENCES preguntas(id) ON DELETE CASCADE,
  INDEX idx_respuestas_pregunta (pregunta_id)
);
