const { app, BrowserWindow, shell, session } = require('electron');
const path = require('node:path');

function createWindow() {
  const appIcon = path.join(__dirname, 'build/icons/512x512.png');
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'WhaTorin WSP',
    icon: appIcon,
    backgroundColor: '#1a1a2e',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      webviewTag: true, // Habilitamos webview para embeber WhatsApp
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadFile('index.html');

  // Manejar apertura de links externos en el navegador del sistema
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith('https://web.whatsapp.com')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // Quitar la barra de menú nativa
  mainWindow.setMenuBarVisibility(false);
}

// User Agent de Chrome para evitar que WhatsApp pida actualizar navegador
const USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

app.whenReady().then(() => {
  // Configurar el User Agent globalmente para la sesión
  session.defaultSession.setUserAgent(USER_AGENT);

  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
