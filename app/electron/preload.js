const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  crearExamen: (examen) => ipcRenderer.invoke('examenes:crear', examen),
  listarExamenes: () => ipcRenderer.invoke('examenes:listar'),
  obtenerExamen: (id) => ipcRenderer.invoke('examenes:obtener', id),
  eliminarExamen: (id) => ipcRenderer.invoke('examenes:eliminar', id),
  getSyncStatus: () => ipcRenderer.invoke('sync:status'),
  onSyncStatusChange: (callback) => {
    ipcRenderer.on('sync:status-changed', (_event, status) => callback(status));
  },
});
