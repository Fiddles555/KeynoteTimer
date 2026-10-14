const { app, BrowserWindow, ipcMain, screen, Menu, dialog } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

let mainWin = null;
let externalWin = null;

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
      nodeIntegration: false,
      backgroundThrottling: false   // keep timer running when window loses focus
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

  // Pick a secondary display if available, otherwise use primary
  const target = displays.find(d => d.id !== primary.id) || primary;
  const { x, y, width, height } = target.bounds;

  externalWin = new BrowserWindow({
    x, y, width, height,
    title: 'Keynote Timer — External Display',
    backgroundColor: '#3da012',
    frame: false,                // always frameless — clean full-screen look
    fullscreen: false,           // never use native fullscreen (traps the user)
    simpleFullscreen: false,
    resizable: true,
    movable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false   // keep receiving state updates when fullscreen
    }
  });

  // Fill the target display exactly using setBounds (works on both displays)
  externalWin.setBounds({ x, y, width, height });

  externalWin.loadFile('external.html');

  externalWin.on('closed', () => {
    externalWin = null;
    if (mainWin && !mainWin.isDestroyed()) {
      mainWin.webContents.send('external-closed');
    }
  });

  // Tell the main window a display is open
  externalWin.webContents.once('did-finish-load', () => {
    if (mainWin && !mainWin.isDestroyed()) {
      mainWin.webContents.send('external-opened');
    }
  });
}

// ── IPC handlers ──────────────────────────────────────────────────────────────

// Main window asks to open/close external
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

// Main window pushes timer state to external window
ipcMain.on('push-state', (_event, state) => {
  if (externalWin && !externalWin.isDestroyed()) {
    externalWin.webContents.send('state-update', state);
  }
});

// Query whether external is open
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
        { role: 'quit' }
      ]
    },
    { role: 'viewMenu' },
    { role: 'windowMenu' }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ── Auto-updater ──────────────────────────────────────────────────────────────
function setupAutoUpdater() {
  autoUpdater.autoDownload = true;       // download silently in background
  autoUpdater.autoInstallOnAppQuit = true; // install when user quits normally

  autoUpdater.on('update-available', () => {
    if (mainWin && !mainWin.isDestroyed()) {
      mainWin.webContents.send('update-status', 'downloading');
    }
  });

  autoUpdater.on('update-downloaded', () => {
    if (!mainWin || mainWin.isDestroyed()) return;
    dialog.showMessageBox(mainWin, {
      type: 'info',
      title: 'Update Ready',
      message: 'A new version of Keynote Timer has been downloaded.',
      detail: 'Restart now to apply the update, or it will be installed automatically when you quit.',
      buttons: ['Restart Now', 'Later'],
      defaultId: 0
    }).then(({ response }) => {
      if (response === 0) autoUpdater.quitAndInstall();
    });
  });

  autoUpdater.on('error', (err) => {
    console.error('Auto-updater error:', err.message);
  });

  // Check for updates ~5 seconds after launch (gives the window time to load)
  setTimeout(() => autoUpdater.checkForUpdates(), 5000);
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
