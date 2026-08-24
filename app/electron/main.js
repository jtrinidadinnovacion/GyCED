const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const repo = require('./examenes-repo');
const sync = require('./sync');

const isDev = !app.isPackaged;

// La app dibuja sus propios controles de ventana (ventana-controles), así que
// se quita el menú nativo de Electron (File/Edit/View/Window) que le resta
// espacio real a la ventana y no forma parte del diseño.
Menu.setApplicationMenu(null);

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 1024,
    minHeight: 700,
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

ipcMain.handle('examenes:actualizar', (_event, id, examen) => {
  const result = repo.actualizar(id, examen);
  sync.syncPending();
  return result;
});

ipcMain.handle('examenes:listar', () => repo.listar());

ipcMain.handle('examenes:obtener', (_event, id) => repo.obtener(id));

ipcMain.handle('examenes:eliminar', (_event, id) => repo.eliminar(id));

ipcMain.handle('sync:status', () => sync.getStatus());

ipcMain.handle('pdf:generar', async (event, opciones) => {
  const win = BrowserWindow.fromWebContents(event.sender);

  const data = await win.webContents.printToPDF({
    printBackground: true,
    pageSize: 'Letter',
    margins: { marginType: 'none' },
  });

  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: 'Guardar examen',
    defaultPath: (opciones && opciones.nombreArchivo) || 'examen.pdf',
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  });

  if (canceled || !filePath) {
    return { guardado: false };
  }

  fs.writeFileSync(filePath, data);
  return { guardado: true, ruta: filePath };
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
