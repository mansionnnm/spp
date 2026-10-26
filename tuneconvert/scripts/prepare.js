// Gathers Next's standalone output into ./app-server so electron-builder can ship it.
const fs = require("fs");
fs.rmSync("app-server", { recursive: true, force: true });
fs.cpSync(".next/standalone", "app-server", { recursive: true });
fs.cpSync(".next/static", "app-server/.next/static", { recursive: true });
if (fs.existsSync("public")) fs.cpSync("public", "app-server/public", { recursive: true });
