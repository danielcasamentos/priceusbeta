const { app, BrowserWindow, Menu, shell, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');

// Registra protocolo customizado priceus://
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('priceus', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('priceus');
}

// ─── Aumenta o limite do heap V8 para evitar OOM (Out-Of-Memory) ao importar ───
// O Electron por padrão permite apenas ~1.5 GB. Fotos RAW em base64 excedem isso rapidamente.
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=4096');
// Habilita debug remoto em modo desenvolvimento
if (!app.isPackaged) {
  app.commandLine.appendSwitch('remote-debugging-port', '9222');
  app.commandLine.appendSwitch('remote-allow-origins', '*');
}

const LOG_FILE = path.join(require('os').tmpdir(), 'priceus-renderer.log');

let mainWindow;

function handleDeepLink(urlStr) {
  try {
    if (!urlStr || !urlStr.startsWith('priceus://')) return;
    const cleanUrl = urlStr.replace('priceus://', 'http://localhost/');
    const parsed = new URL(cleanUrl);
    const params = new URLSearchParams(parsed.hash ? parsed.hash.substring(1) : parsed.search);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (accessToken && mainWindow) {
      mainWindow.webContents.send('auth-callback', {
        access_token: accessToken,
        refresh_token: refreshToken || '',
      });
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  } catch (err) {
    console.warn('[DeepLink] Erro ao processar URL:', err);
  }
}

// macOS Open-URL protocol listener
app.on('open-url', (event, url) => {
  event.preventDefault();
  handleDeepLink(url);
});

// Servidor loopback local para login instantâneo com 1 clique pelo navegador
let authServer;
function startLocalAuthServer() {
  try {
    authServer = http.createServer((req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      const parsedUrl = new URL(req.url, 'http://127.0.0.1:54321');
      if (parsedUrl.pathname === '/auth-callback') {
        const accessToken = parsedUrl.searchParams.get('access_token');
        const refreshToken = parsedUrl.searchParams.get('refresh_token');

        if (accessToken && mainWindow) {
          mainWindow.webContents.send('auth-callback', {
            access_token: accessToken,
            refresh_token: refreshToken || '',
          });
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.focus();
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Autenticado com sucesso no PriceU$ Desktop' }));
        return;
      }

      res.writeHead(404);
      res.end('Not found');
    });

    authServer.listen(54321, '127.0.0.1', () => {
      console.log('[AuthServer] Servidor loopback de login rodando em http://127.0.0.1:54321');
    });
  } catch (err) {
    console.warn('[AuthServer] Falha ao iniciar loopback server:', err);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 850,
    minWidth: 1024,
    minHeight: 700,
    title: 'PriceU$ Desktop',
    icon: path.join(__dirname, '../public/Logo_price_Us_512x512.png'),
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#07101f',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      // sandbox: true causava travamento ao abrir DevTools — removido
      sandbox: false,
      devTools: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  startLocalAuthServer();

  const distPath = path.join(__dirname, '../dist/index.html');

  if (fs.existsSync(distPath)) {
    mainWindow.loadFile(distPath);
  } else {
    mainWindow.loadURL('http://localhost:5173');
  }

  // Abre DevTools automaticamente em modo desenvolvimento
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  // Redireciona links com target="_blank" ou URLs externas para o navegador padrão do sistema (Safari/Chrome)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // Captura logs do renderer para terminal e arquivo monitorável em tempo real
  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    const entry = `[${new Date().toISOString()}] [L${level}] ${message} (${sourceId}:${line})\n`;
    process.stdout.write(entry);
    try {
      fs.appendFileSync(LOG_FILE, entry);
    } catch {}
  });

  setupNativeMenu();
}

function setupNativeMenu() {
  const isMac = process.platform === 'darwin';

  const template = [
    ...(isMac
      ? [
          {
            label: 'PriceU$',
            submenu: [
              { role: 'about', label: 'Sobre o PriceU$' },
              { type: 'separator' },
              { role: 'services', label: 'Serviços' },
              { type: 'separator' },
              { role: 'hide', label: 'Ocultar PriceU$' },
              { role: 'hideOthers', label: 'Ocultar Outros' },
              { role: 'unhide', label: 'Exibir Todos' },
              { type: 'separator' },
              { role: 'quit', label: 'Encerrar PriceU$' },
            ],
          },
        ]
      : []),
    {
      label: 'Arquivo',
      submenu: [
        {
          label: 'Novo Ensaio Culling...',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            if (mainWindow) mainWindow.webContents.send('menu-action', 'new-culling');
          },
        },
        {
          label: 'Abrir Pasta de Fotos RAW...',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            if (mainWindow) mainWindow.webContents.send('menu-action', 'open-folder');
          },
        },
        { type: 'separator' },
        isMac ? { role: 'close', label: 'Fechar Janela' } : { role: 'quit', label: 'Sair' },
      ],
    },
    {
      label: 'Editar',
      submenu: [
        { role: 'undo', label: 'Desfazer' },
        { role: 'redo', label: 'Refazer' },
        { type: 'separator' },
        { role: 'cut', label: 'Recortar' },
        { role: 'copy', label: 'Copiar' },
        { role: 'paste', label: 'Colar' },
        { role: 'selectAll', label: 'Selecionar Tudo' },
      ],
    },
    {
      label: 'Visualização',
      submenu: [
        { role: 'reload', label: 'Recarregar' },
        { role: 'forceReload', label: 'Recarregar Forçado' },
        { role: 'toggleDevTools', label: 'Ferramentas do Desenvolvedor' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Tamanho Normal' },
        { role: 'zoomIn', label: 'Aumentar Zoom' },
        { role: 'zoomOut', label: 'Diminuir Zoom' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Tela Cheia' },
      ],
    },
    {
      label: 'Janela',
      submenu: [
        { role: 'minimize', label: 'Minimizar' },
        { role: 'zoom', label: 'Zoom' },
        { type: 'separator' },
        {
          label: 'Console de Logs de Suporte / Dev',
          accelerator: 'CmdOrCtrl+Shift+L',
          click: () => {
            if (mainWindow) mainWindow.webContents.send('toggle-log-drawer');
          },
        },
        { type: 'separator' },
        { role: 'front', label: 'Trazer Tudo para a Frente' },
      ],
    },
    {
      label: 'Ajuda',
      submenu: [
        {
          label: 'Suporte ao Fotógrafo',
          click: async () => {
            await shell.openExternal('https://wa.me/5500000000000');
          },
        },
        {
          label: 'Documentação & Tutoriais',
          click: async () => {
            await shell.openExternal('https://priceus.com.br/tutoriais');
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

ipcMain.handle('write-xmp-file', async (_event, filePath, xmpContent) => {
  try {
    fs.writeFileSync(filePath, xmpContent, 'utf-8');
    return { success: true };
  } catch (err) {
    console.error('[Electron IPC] Erro ao gravar arquivo .XMP:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('read-folder-files', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Selecione a Pasta de Fotos para Culling',
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const rootFolderPath = result.filePaths[0];
  const fileItems = [];

  function scanFolderRecursive(dirPath, relativePrefix = '') {
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        const relPath = relativePrefix ? `${relativePrefix}/${entry.name}` : entry.name;

        if (entry.isDirectory()) {
          scanFolderRecursive(fullPath, relPath);
        } else if (entry.isFile()) {
          const ext = entry.name.split('.').pop()?.toLowerCase() || '';
          const validExts = [
            'jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'tif', 'tiff', 'gif', 'bmp',
            'cr2', 'cr3', 'nef', 'nrw', 'arw', 'srf', 'sr2', 'raf', 'rw2', 'raw', 'orf', 'dng', '3fr', 'iiq', 'pef', 'x3f'
          ];
          if (validExts.includes(ext)) {
            const parts = relPath.split('/').filter(Boolean);
            let subfolder = 'Fotos Gerais';
            if (parts.length >= 2) {
              subfolder = parts[parts.length - 2];
            } else {
              subfolder = 'Pasta Raiz';
            }
            fileItems.push({
              fullPath,
              fileName: entry.name,
              relativePath: relPath,
              subfolderName: subfolder,
            });
          }
        }
      }
    } catch (err) {
      console.warn('[Electron Scan] Erro ao ler subpasta:', dirPath, err);
    }
  }

  scanFolderRecursive(rootFolderPath);
  return { rootFolderPath, fileItems };
});

const { exec } = require('child_process');

ipcMain.handle('launch-lightroom', async (event, folderPath) => {
  return new Promise((resolve) => {
    const isMac = process.platform === 'darwin';
    let cmd = isMac
      ? (folderPath ? `open -a "Adobe Lightroom Classic" --args -import "${folderPath}"` : `open -a "Adobe Lightroom Classic"`)
      : (folderPath ? `start "" "Lightroom.exe" -import "${folderPath}"` : `start "" "Lightroom.exe"`);

    exec(cmd, (err) => {
      if (err) {
        console.warn('[Electron] Erro ao abrir Adobe Lightroom Classic:', err);
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
