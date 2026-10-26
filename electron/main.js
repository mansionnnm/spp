const { app, BrowserWindow, shell } = require("electron");
const { spawn } = require("child_process");
const path = require("path");
const net = require("net");
const http = require("http");

let server, win;
const serverDir = app.isPackaged ? path.join(process.resourcesPath, "server") : path.join(__dirname, "..", "app-server");

function freePort() {
  return new Promise((res) => { const s = net.createServer().listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => res(p)); }); });
}
function waitFor(port) {
  return new Promise((res, rej) => {
    const t0 = Date.now();
    (function poll() {
      http.get({ host: "127.0.0.1", port, path: "/" }, () => res()).on("error", () =>
        Date.now() - t0 > 30000 ? rej(new Error("Server did not start")) : setTimeout(poll, 300));
    })();
  });
}

app.whenReady().then(async () => {
  const port = await freePort();
  let ffmpeg = require("ffmpeg-static");
  ffmpeg = ffmpeg.replace("app.asar", "app.asar.unpacked");
  server = spawn(process.execPath, [path.join(serverDir, "server.js")], {
    cwd: serverDir,
    env: { ...process.env, ELECTRON_RUN_AS_NODE: "1", PORT: String(port), HOSTNAME: "127.0.0.1", FFMPEG_PATH: ffmpeg },
    stdio: "inherit",
  });
  await waitFor(port);
  win = new BrowserWindow({ width: 1100, height: 900, backgroundColor: "#07070d", autoHideMenuBar: true });
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: "deny" }; });
  win.loadURL(`http://127.0.0.1:${port}`);
});
app.on("window-all-closed", () => app.quit());
app.on("quit", () => server && server.kill());
