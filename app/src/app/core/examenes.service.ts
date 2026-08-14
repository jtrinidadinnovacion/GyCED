import { Injectable } from '@angular/core';
import type { Examen, SyncStatus } from './electron-api.d';

@Injectable({ providedIn: 'root' })
export class ExamenesService {
  crearExamen(examen: Examen) {
    return window.electronAPI.crearExamen(examen);
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
