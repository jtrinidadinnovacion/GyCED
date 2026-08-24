import { Injectable } from '@angular/core';
import type { Examen, SyncStatus } from './electron-api.d';

@Injectable({ providedIn: 'root' })
export class ExamenesService {
  crearExamen(examen: Examen) {
    return window.electronAPI.crearExamen(examen);
  }

  actualizarExamen(id: string, examen: Examen) {
    return window.electronAPI.actualizarExamen(id, examen);
  }

  /** Actualiza el examen en la base de datos si ya existe un id (creado en "Ingresa datos")
   *  y la app corre dentro de Electron. Devuelve false si el guardado falló. */
  async guardarSiHayExamen(examenId: string | null, examen: Examen): Promise<boolean> {
    if (!examenId || !window.electronAPI?.actualizarExamen) return true;

    try {
      await this.actualizarExamen(examenId, examen);
      return true;
    } catch {
      return false;
    }
  }

  listarExamenes() {
    return window.electronAPI.listarExamenes();
  }

  obtenerExamen(id: string) {
    return window.electronAPI.obtenerExamen(id);
  }

  eliminarExamen(id: string) {
    return window.electronAPI.eliminarExamen(id);
  }

  getSyncStatus(): Promise<SyncStatus> {
    return window.electronAPI.getSyncStatus();
  }

  onSyncStatusChange(callback: (status: SyncStatus) => void) {
    window.electronAPI.onSyncStatusChange(callback);
  }
}
