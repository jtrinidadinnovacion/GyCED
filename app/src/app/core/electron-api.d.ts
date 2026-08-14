export type TipoPregunta = 'opcion_multiple' | 'verdadero_falso' | 'completar' | 'abierta' | 'relacionar_imagen';

export interface Respuesta {
  id?: string;
  texto?: string | null;
  imagenData?: string | null;
  esCorrecta: boolean;
  orden?: number;
}

export interface Pregunta {
  id?: string;
  tipo: TipoPregunta;
  orden?: number;
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
  createdAt?: string;
  updatedAt?: string;
  syncStatus?: 'pendiente' | 'sincronizado' | 'error';
  preguntas: Pregunta[];
}

export interface SyncStatus {
  isOnline: boolean;
  pendientes: number;
}

export interface ElectronAPI {
  crearExamen: (examen: Examen) => Promise<{ id: string }>;
  listarExamenes: () => Promise<Examen[]>;
  obtenerExamen: (id: string) => Promise<Examen | null>;
  eliminarExamen: (id: string) => Promise<void>;
  getSyncStatus: () => Promise<SyncStatus>;
  onSyncStatusChange: (callback: (status: SyncStatus) => void) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
