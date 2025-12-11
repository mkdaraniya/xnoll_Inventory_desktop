const { ipcMain } = require("electron");
const { spawn } = require("child_process");
const path = require("path");

ipcMain.handle("dev:run-seeder", async () => {
  try {
    const seedPath = path.join(__dirname, "..", "database", "seed.js");

    return new Promise((resolve) => {
      const child = spawn(process.execPath, [seedPath]);  // ← FIX HERE

      let logs = "";

      child.stdout.on("data", (data) => {
        logs += data.toString();
        console.log("[SEEDER]", data.toString());
      });

      child.stderr.on("data", (data) => {
        logs += "ERROR: " + data.toString();
      });

      child.on("close", (code) => {
        resolve(logs || `Seeder finished with code ${code}`);
      });
    });

  } catch (err) {
    return "Seeder failed: " + err.message;
  }
});

