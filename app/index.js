const { app, BrowserWindow, ipcMain, protocol, screen } = require('electron');
const isDev = require('electron-is-dev');
const path = require('path');
const fetch = require('electron-fetch').default;

if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
  app.quit();
}

function createWindow () {

  app.allowRendererProcessReuse = false;

  const gui = path.normalize(path.join(__dirname, '..', 'build'));

  protocol.interceptFileProtocol('file', (request, callback) => {
    const url = request.url.substr('file://'.length)
    const p = (url === '' || url === '/') ? 'index.html' : url;
    callback({  path: path.join(gui, p) });
  });

  const {width, height} = screen.getPrimaryDisplay().size;

  const win = new BrowserWindow({
    icon: path.normalize(
      path.join(__dirname, ...(isDev ? ['..', 'gui', 'public'] : ['..', 'build']), 'icon_wave.2872aeea710c.png')
    ),
    width: Math.floor(width * 0.618),
    height: Math.floor(height * 0.618),
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true,
    },
  });

  win.removeMenu();

  if (process.argv.indexOf('--debug') >= 0) {
    win.webContents.openDevTools({ mode: 'detach' });
  }

  if (isDev) {
    win.loadURL('http://localhost:3000');
  } else {
    win.loadURL('file:///');
  }

  ipcMain.handle('fetch', async (_, ...args) => {
    const response = await fetch(...args.map(JSON.parse));
    const headers = Object.fromEntries(response.headers.entries());
    body = (response.headers.has('Content-Type') && /^application\/json/.test(response.headers.get('Content-Type'))) ?
      await response.json() : await response.text();
    return JSON.stringify({
      status: response.status,
      statusText: response.statusText,
      body, headers,
    });
  });
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
