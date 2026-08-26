const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const { PDFDocument, rgb } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');
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

// En producción el build siempre corre `ng build` antes de empaquetar, así
// que dist/app/browser/fonts está garantizado; en desarrollo (`electron .`
// apuntando a localhost:4200) puede no existir todavía si nunca se corrió un
// build, así que se recurre a la carpeta de origen de los assets.
const FUENTES_DIR = [
  path.join(__dirname, '../dist/app/browser/fonts'),
  path.join(__dirname, '../public/fonts'),
].find((candidato) => fs.existsSync(path.join(candidato, 'Goldplay-Bold.ttf')));

// Cuánto se reserva sin usar en el borde inferior de cada hoja: coincide
// exactamente con el `padding-bottom: 2.25rem` (36px = 27pt) que ya trae
// `.medidor` en gen_examen.css, así que Chromium jamás dibuja contenido en
// esa franja al paginar -- moverla hacia arriba no puede sacar nada de la
// hoja hacia abajo.
const RESPIRO_PT = 27;

// Página 2 en adelante no lleva el encabezado morado, así que sin ajuste
// su primera pregunta queda pegada al borde superior de la hoja. Electron
// no permite un margen de impresión distinto por página, y probar un
// margen superior global (con el encabezado "sangrando" hacia él con
// margin-top negativo) falló: Chromium recorta cualquier contenido dentro
// de la zona de margen, no deja sangrar ahí como sí permite a los costados
// con margen 0. La alternativa segura: imprimir todo con margen 0 (ya
// probado, confiable) y, ya con el PDF final generado, desplazar hacia
// abajo el contenido completo de cada página 2+ usando el espacio que ya
// estaba libre en su borde inferior -- sin arriesgar que algo se salga de
// la hoja, porque esa franja nunca tuvo contenido para empezar.
function ajustarMargenSuperiorPaginas(pdfDoc) {
  const paginas = pdfDoc.getPages();
  for (let i = 1; i < paginas.length; i++) {
    paginas[i].translateContent(0, -RESPIRO_PT);
  }
}

// El bloque "GyCED / Generador y Creador de Evaluaciónes Diagnosticas" debe
// aparecer una sola vez, pegado al fondo de la ÚLTIMA hoja del examen, sin
// importar cuántas páginas tenga. Chromium no ofrece ninguna forma confiable
// de lograr esto solo con CSS de impresión (ni @page, ni position:fixed,
// que además se repite en cada hoja) -- por eso el HTML se imprime SIN este
// bloque, y aquí, ya con el PDF final generado, se dibuja directamente sobre
// la última página en la posición exacta donde iría.
function estamparPieDePagina(pdfDoc, fuenteLogo, fuenteTexto) {
  const paginas = pdfDoc.getPages();
  const ultima = paginas[paginas.length - 1];
  const { width } = ultima.getSize();

  const textoLogo = 'GyCED';
  const textoTagline = 'Generador y Creador de Evaluaciónes Diagnosticas';
  const tamanoLogo = 15.6; // 1.3rem a 96dpi, convertido a puntos PDF (px * 0.75)
  const tamanoTagline = 9.6; // 0.8rem
  const colorLogo = rgb(91 / 255, 61 / 255, 240 / 255); // #5b3df0
  const colorTagline = rgb(67 / 255, 97 / 255, 238 / 255); // #4361ee

  const anchoLogo = fuenteLogo.widthOfTextAtSize(textoLogo, tamanoLogo);
  const anchoTagline = fuenteTexto.widthOfTextAtSize(textoTagline, tamanoTagline);

  // y=36pt (0.5in) de respiro bajo la línea base del lema, para que no
  // quede pegado al borde de corte de la hoja como reportaron al probarlo
  // con 26pt (se veía casi cortado).
  ultima.drawText(textoLogo, {
    x: (width - anchoLogo) / 2,
    y: 54,
    size: tamanoLogo,
    font: fuenteLogo,
    color: colorLogo,
  });

  ultima.drawText(textoTagline, {
    x: (width - anchoTagline) / 2,
    y: 36,
    size: tamanoTagline,
    font: fuenteTexto,
    color: colorTagline,
  });
}

async function ajustarPdfFinal(pdfBytes) {
  const pdfDoc = await PDFDocument.load(pdfBytes);

  ajustarMargenSuperiorPaginas(pdfDoc);

  if (!FUENTES_DIR) {
    console.warn('No se encontró la carpeta de fuentes Goldplay; se omite el pie de página del PDF.');
    return pdfDoc.save();
  }

  pdfDoc.registerFontkit(fontkit);
  const [bytesLogo, bytesTexto] = await Promise.all([
    fs.promises.readFile(path.join(FUENTES_DIR, 'Goldplay-Bold.ttf')),
    fs.promises.readFile(path.join(FUENTES_DIR, 'Goldplay-Regular.ttf')),
  ]);
  const fuenteLogo = await pdfDoc.embedFont(bytesLogo);
  const fuenteTexto = await pdfDoc.embedFont(bytesTexto);

  estamparPieDePagina(pdfDoc, fuenteLogo, fuenteTexto);

  return pdfDoc.save();
}

ipcMain.handle('pdf:generar', async (event, opciones) => {
  const win = BrowserWindow.fromWebContents(event.sender);

  // marginType:'none' es el único modo confiable para el sangrado completo
  // del encabezado: se probó `marginType:'custom'` con margen superior para
  // que las páginas 2+ tuvieran aire arriba, pero Chromium recorta
  // estrictamente cualquier contenido dentro de esa zona de margen (no deja
  // "sangrar" con margin-top negativo como sí permite a los costados con
  // margen 0). El aire en las páginas 2+ se agrega después, editando el PDF
  // ya generado (ver ajustarMargenSuperiorPaginas más abajo).
  const dataOriginal = await win.webContents.printToPDF({
    printBackground: true,
    pageSize: 'Letter',
    margins: { marginType: 'none' },
  });

  let data = dataOriginal;
  try {
    data = await ajustarPdfFinal(dataOriginal);
  } catch (error) {
    console.error('No se pudo ajustar el PDF (margen superior / pie de página), se guardará sin esos ajustes:', error);
  }

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
