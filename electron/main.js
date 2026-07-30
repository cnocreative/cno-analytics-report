// CNO Reports — Electron main process.
// Wraps the existing static index.html in a native desktop window.
// The app is a self-contained web page; there is no server and no Node code in the renderer.
const { app, BrowserWindow, Menu, shell } = require("electron");
const path = require("path");

const ROOT = path.join(__dirname, "..");

function createWindow() {
  const win = new BrowserWindow({
    width: 1320,
    height: 920,
    minWidth: 960,
    minHeight: 600,
    backgroundColor: "#fbf3e2",
    title: "CNO Reports",
    icon: path.join(ROOT, "icon-512.png"),
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: true
    }
  });

  win.loadFile(path.join(ROOT, "index.html"));

  // Open external links (cnocreative.co, share links) in the system browser, not inside the app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });

  return win;
}

// A minimal, familiar menu (Print, reload, zoom, quit). Everything else lives in the page.
function buildMenu() {
  const isMac = process.platform === "darwin";
  const template = [
    ...(isMac ? [{ role: "appMenu" }] : []),
    {
      label: "File",
      submenu: [
        {
          label: "Print / Save as PDF",
          accelerator: "CmdOrCtrl+P",
          // Route through the report's own button so the required-AI gate,
          // page preparation, and client-ready checks cannot be bypassed.
          click: (_i, win) => win && win.webContents.executeJavaScript(
            'document.getElementById("printBtn")?.click()'
          )
        },
        { type: "separator" },
        isMac ? { role: "close" } : { role: "quit" }
      ]
    },
    { role: "editMenu" },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" }
      ]
    },
    {
      label: "Help",
      submenu: [
        {
          label: "CNO Creative Co website",
          click: () => shell.openExternal("https://cnocreative.co/")
        }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  buildMenu();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
