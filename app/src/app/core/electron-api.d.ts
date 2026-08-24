export type TipoPregunta = 'opcion_multiple' | 'verdadero_falso' | 'completar' | 'abierta' | 'relacionar_imagen';

export interface Respuesta {
  id?: string;
  texto?: string | null;
  imagenData?: string | null;
  esCorrecta: boolean;
}

export interface Pregunta {
  id?: string;
  tipo: TipoPregunta;
  texto?: string | null;
  imagenData?: string | null;
  respuestas: Respuesta[];
}

export interface Examen {
  id?: string;
  titulo: string;
  instrucciones?: string | null;
  nombrePlantel?: string | null;
  nombreDocente?: string | null;
  fechaEvaluacion?: string | null;
  grupo?: string | null;
  nuevo?: string;
  actualizacion?: string;
  estado?: 'pendiente' | 'sincronizado' | 'error';
  preguntas: Pregunta[];
}

export interface SyncStatus {
  isOnline: boolean;
  pendientes: number;
}

export interface ResultadoPdf {
  guardado: boolean;
  ruta?: string;
}

export interface ElectronAPI {
  crearExamen: (examen: Examen) => Promise<{ id: string }>;
  actualizarExamen: (id: string, examen: Examen) => Promise<{ id: string }>;
  listarExamenes: () => Promise<Examen[]>;
  obtenerExamen: (id: string) => Promise<Examen | null>;
  eliminarExamen: (id: string) => Promise<void>;
  getSyncStatus: () => Promise<SyncStatus>;
  onSyncStatusChange: (callback: (status: SyncStatus) => void) => void;
  generarPdf: (opciones?: { nombreArchivo?: string }) => Promise<ResultadoPdf>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
