const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const repo = require('./examenes-repo');
const sync = require('./sync');

const isDev = !app.isPackaged;

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    win.loadURL('http://localhost:4200');
  } else {
    win.loadFile(path.join(__dirname, '../dist/app/browser/index.html'));
  }

  sync.start((status) => {
    win.webContents.send('sync:status-changed', status);
  });
}

ipcMain.handle('examenes:crear', (_event, examen) => {
  const result = repo.crear(examen);
  sync.syncPending();
  return result;
});

ipcMain.handle('examenes:listar', () => repo.listar());

ipcMain.handle('examenes:obtener', (_event, id) => repo.obtener(id));

ipcMain.handle('examenes:eliminar', (_event, id) => repo.eliminar(id));

ipcMain.handle('sync:status', () => sync.getStatus());

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
