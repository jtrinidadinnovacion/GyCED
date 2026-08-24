import { Injectable } from '@angular/core';

export interface OpcionExamen {
  texto: string;
  correcta: boolean;
}

export interface PreguntaExamen {
  numero: number;
  texto: string;
  tipo: 'opciones' | 'espacios' | 'abierta';
  opciones: OpcionExamen[];
  respuestasEspacios: string[];
}

export interface ParExamen {
  numero: number;
  pregunta: string;
  respuesta: string;
}

@Injectable({ providedIn: 'root' })
export class DatosExamenService {
  plantel = '';
  docente = '';
  fecha = '';
  grupo = '';
  tipo: string | null = null;
  modoRelacion: string | null = null;
  examenId: string | null = null;

  tituloExamen = '';
  instrucciones = '';
  lecturaExamen = '';
  preguntasExamen: PreguntaExamen[] = [];
  paresExamen: ParExamen[] = [];
}
