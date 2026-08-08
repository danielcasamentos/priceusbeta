const { app, BrowserWindow, Menu, shell, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// Habilita debug remoto em modo desenvolvimento (permite conexão via Chrome DevTools MCP)
if (!app.isPackaged) {
  app.commandLine.appendSwitch('remote-debugging-port', '9222');
  app.commandLine.appendSwitch('remote-allow-origins', '*');
}

const LOG_FILE = path.join(require('os').tmpdir(), 'priceus-renderer.log');

let mainWindow;

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
      sandbox: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  const distPath = path.join(__dirname, '../dist/index.html');

  if (fs.existsSync(distPath)) {
    mainWindow.loadFile(distPath);
  } else {
    mainWindow.loadURL('http://localhost:5173');
  }

  // Redireciona links com target="_blank" ou URLs externas para o navegador padrão do sistema (Safari/Chrome)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // Captura logs do renderer para arquivo monitorável em tempo real
  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    if (level >= 2) { // 2=warning, 3=error
      const entry = `[${new Date().toISOString()}] [L${level}] ${message} (${sourceId}:${line})\n`;
      fs.appendFileSync(LOG_FILE, entry);
    }
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

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
