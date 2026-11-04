const { app, BrowserWindow, Tray, Menu, nativeImage, shell, globalShortcut, ipcMain, nativeTheme } = require('electron');
const path = require('path');

// Permitir una sola instancia
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) { app.quit(); }

// No mostrar en el Dock — es una app de barra de menú
app.dock && app.dock.hide();

let tray   = null;
let win    = null;
let winVisible = false;

/* ── Ruta a los archivos de la app ─────────────────────── */
function appRoot() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'app');
  }
  return path.join(__dirname, '..');
}

/* ── Crear ventana principal ───────────────────────────── */
function createWindow() {
  win = new BrowserWindow({
    width:  1100,
    height: 760,
    show:   false,
    frame:  true,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    vibrancy: 'under-window',
    visualEffectState: 'followWindow',
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#0E0E1A' : '#F9F7F4',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
    resizable: true,
    minWidth:  720,
    minHeight: 500,
  });

  win.loadFile(path.join(appRoot(), 'index.html'));

  // Ocultar en vez de cerrar
  win.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      hideWindow();
    }
  });

  win.on('show', () => { winVisible = true; _updateTrayMenu(); });
  win.on('hide', () => { winVisible = false; _updateTrayMenu(); });

  // Abrir links externos en el navegador del sistema
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

/* ── Mostrar / ocultar ventana ─────────────────────────── */
function showWindow() {
  if (!win) createWindow();
  win.show();
  win.focus();
  app.dock && app.dock.show();
  winVisible = true;
  _updateTrayMenu();
}

function hideWindow() {
  if (!win) return;
  win.hide();
  app.dock && app.dock.hide();
  winVisible = false;
  _updateTrayMenu();
}

function toggleWindow() {
  winVisible ? hideWindow() : showWindow();
}

/* ── Icono de la barra de menú ─────────────────────────── */
function createTray() {
  // Icono monocromático para la barra (Template image = se adapta a light/dark)
  const iconPath = path.join(__dirname, 'assets', 'tray-icon.png');
  let icon = nativeImage.createFromPath(iconPath);

  // Escalar a 16×16 si es necesario (macOS espera tamaños exactos)
  if (!icon.isEmpty()) {
    icon = icon.resize({ width: 16, height: 16 });
    icon.setTemplateImage(true); // se vuelve blanco/negro según el tema
  } else {
    // Fallback: texto emoji si no hay archivo
    icon = nativeImage.createEmpty();
  }

  tray = new Tray(icon);
  tray.setToolTip('Planificador ID');

  // Click principal: toggle de la ventana
  tray.on('click', toggleWindow);

  _updateTrayMenu();
}

function _updateTrayMenu() {
  if (!tray) return;

  const menu = Menu.buildFromTemplate([
    {
      label: winVisible ? '✓  Planificador ID' : 'Planificador ID',
      enabled: false,
      icon: nativeImage.createEmpty(),
    },
    { type: 'separator' },
    {
      label: winVisible ? 'Ocultar ventana' : 'Abrir Planificador ID',
      accelerator: 'CmdOrCtrl+Shift+P',
      click: toggleWindow,
    },
    { type: 'separator' },
    {
      label: 'Hoy',
      click: () => { showWindow(); win.webContents.executeJavaScript("window.location.hash='#hoy'"); },
    },
    {
      label: 'Semana',
      click: () => { showWindow(); win.webContents.executeJavaScript("window.location.hash='#semana'"); },
    },
    {
      label: 'Portafolio',
      click: () => { showWindow(); win.webContents.executeJavaScript("window.location.hash='#portafolio'"); },
    },
    {
      label: 'Notas',
      click: () => { showWindow(); win.webContents.executeJavaScript("window.location.hash='#notas'"); },
    },
    { type: 'separator' },
    {
      label: 'Preferencias…',
      accelerator: 'CmdOrCtrl+,',
      click: () => { showWindow(); win.webContents.executeJavaScript("window.location.hash='#config'"); },
    },
    { type: 'separator' },
    {
      label: 'Salir',
      accelerator: 'CmdOrCtrl+Q',
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(menu);
}

/* ── App lifecycle ─────────────────────────────────────── */
app.whenReady().then(() => {
  createTray();
  createWindow();

  // Atajo global para mostrar/ocultar desde cualquier app
  globalShortcut.register('CmdOrCtrl+Shift+P', toggleWindow);

  // Segunda instancia → enfocar ventana existente
  app.on('second-instance', () => showWindow());
});

app.on('window-all-closed', (e) => {
  // No salir al cerrar la ventana — seguir en la barra de menú
  e.preventDefault && e.preventDefault();
});

app.on('activate', () => {
  // Clic en el Dock (si se muestra)
  showWindow();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

// Adaptar color de fondo al tema del sistema
nativeTheme.on('updated', () => {
  if (win) {
    win.setBackgroundColor(nativeTheme.shouldUseDarkColors ? '#0E0E1A' : '#F9F7F4');
  }
});

/* ── IPC ───────────────────────────────────────────────── */
ipcMain.handle('get-app-version', () => app.getVersion());
ipcMain.handle('hide-window', () => hideWindow());
ipcMain.handle('open-external', (_, url) => shell.openExternal(url));
