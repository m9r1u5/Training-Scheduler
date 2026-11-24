// Desktop shell: runs the same web files (index.html, app.js, core.js) in a Windows window.
const { app, BrowserWindow, protocol, net, shell, Menu } = require('electron');
const path = require('path'), { pathToFileURL } = require('url');
// A fixed app:// address keeps the saved data in the same place on every launch.
protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } }]);
if (!app.requestSingleInstanceLock()) app.quit();
let win;
app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.whenReady().then(() => {
  const root = path.join(__dirname, 'www');
  protocol.handle('app', req => {
    let p = decodeURIComponent(new URL(req.url).pathname); if (p === '/' || p === '') p = '/index.html';
    const f = path.join(root, p);
    if (!f.startsWith(root)) return new Response('Forbidden', { status: 403 });
    return net.fetch(pathToFileURL(f).toString());
  });
  Menu.setApplicationMenu(null);
  win = new BrowserWindow({ width: 560, height: 900, minWidth: 360, backgroundColor: '#0b1620', title: 'Training Scheduler', icon: path.join(root, 'icon.png'), webPreferences: { contextIsolation: true } });
  win.loadURL('app://local/index.html');
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
});
app.on('window-all-closed', () => app.quit());
