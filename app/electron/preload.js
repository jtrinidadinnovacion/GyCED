const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  crearExamen: (examen) => ipcRenderer.invoke('examenes:crear', examen),
  actualizarExamen: (id, examen) => ipcRenderer.invoke('examenes:actualizar', id, examen),
  listarExamenes: () => ipcRenderer.invoke('examenes:listar'),
  obtenerExamen: (id) => ipcRenderer.invoke('examenes:obtener', id),
  eliminarExamen: (id) => ipcRenderer.invoke('examenes:eliminar', id),
  getSyncStatus: () => ipcRenderer.invoke('sync:status'),
  generarPdf: (opciones) => ipcRenderer.invoke('pdf:generar', opciones),
  onSyncStatusChange: (callback) => {
    ipcRenderer.on('sync:status-changed', (_event, status) => callback(status));
  },
});
