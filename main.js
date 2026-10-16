const { app, BrowserWindow, ipcMain, screen, Menu, dialog, shell } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

let mainWin = null;
let externalWin = null;

// ── Auto-updater ───────────────────────────────────────────────────────────────
function setupAutoUpdater() {
  autoUpdater.autoDownload = false;

  autoUpdater.on('update-available', () => {
    dialog.showMessageBox(mainWin, {
      type: 'info',
      title: 'Update Available',
      message: 'A new version of Keynote Timer is available.',
      detail: 'Click Download to get the latest version from GitHub.',
      buttons: ['Download', 'Later']
    }).then(result => {
      if (result.response === 0) {
        shell.openExternal('https://github.com/Fiddles555/KeynoteTimer/releases/latest');
      }
    });
  });

  autoUpdater.on('error', (err) => {
    console.error('Auto-updater error:', err);
  });

  autoUpdater.checkForUpdates();
}

function createMainWindow() {
  mainWin = new BrowserWindow({
    width: 1200,
    height: 780,
    minWidth: 800,
    minHeight: 600,
    title: 'Keynote Timer',
    backgroundColor: '#111111',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWin.loadFile('index.html');

  mainWin.on('closed', () => {
    if (externalWin && !externalWin.isDestroyed()) externalWin.close();
    mainWin = null;
  });

  buildMenu();
}

function createExternalWindow() {
  const displays = screen.getAllDisplays();
  const primary = screen.getPrimaryDisplay();

  const target = displays.find(d => d.id !== primary.id) || primary;
  const { x, y, width, height } = target.bounds;

  externalWin = new BrowserWindow({
    x, y, width, height,
    title: 'Keynote Timer — External Display',
    backgroundColor: '#3da012',
    frame: false,
    fullscreen: false,
    simpleFullscreen: false,
    resizable: true,
    movable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  externalWin.setBounds({ x, y, width, height });
  externalWin.loadFile('external.html');

  externalWin.on('closed', () => {
    externalWin = null;
    if (mainWin && !mainWin.isDestroyed()) {
      mainWin.webContents.send('external-closed');
    }
  });

  externalWin.webContents.once('did-finish-load', () => {
    if (mainWin && !mainWin.isDestroyed()) {
      mainWin.webContents.send('external-opened');
    }
  });
}

// ── IPC handlers ──────────────────────────────────────────────────────────────
ipcMain.on('open-external', () => {
  if (externalWin && !externalWin.isDestroyed()) {
    externalWin.focus();
    return;
  }
  createExternalWindow();
});

ipcMain.on('close-external', () => {
  if (externalWin && !externalWin.isDestroyed()) externalWin.close();
});

ipcMain.on('push-state', (_event, state) => {
  if (externalWin && !externalWin.isDestroyed()) {
    externalWin.webContents.send('state-update', state);
  }
});

ipcMain.handle('external-status', () => {
  return externalWin && !externalWin.isDestroyed();
});

// ── Menu ──────────────────────────────────────────────────────────────────────
function buildMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac ? [{ role: 'appMenu' }] : []),
    {
      label: 'Timer',
      submenu: [
        {
          label: 'Open External Display',
          accelerator: isMac ? 'Cmd+Shift+E' : 'Ctrl+Shift+E',
          click: () => {
            if (mainWin) mainWin.webContents.send('menu-open-external');
          }
        },
        {
          label: 'Close External Display',
          accelerator: isMac ? 'Cmd+Shift+W' : 'Ctrl+Shift+W',
          click: () => {
            if (externalWin && !externalWin.isDestroyed()) externalWin.close();
          }
        },
        { type: 'separator' },
        {
          label: 'Check for Updates...',
          click: () => autoUpdater.checkForUpdates()
        },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    { role: 'viewMenu' },
    { role: 'windowMenu' }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ── App lifecycle ─────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  createMainWindow();
  setupAutoUpdater();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
});
