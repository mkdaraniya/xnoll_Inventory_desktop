// electron/ipc/seeder.ipc.js
const { ipcMain } = require("electron");
const { spawn } = require("child_process");
const path = require("path");

ipcMain.handle("dev:run-seeder", async (event) => {  // Changed to handle
  return new Promise((resolve, reject) => {  // Wrap in Promise for await
    try {
      const seedPath = path.join(__dirname, "..", "database", "seed.js");
      if (!require("fs").existsSync(seedPath)) {
        const err = new Error(`Seeder script not found: ${seedPath}`);
        event.sender.send("seeder:log", `ERROR: ${err.message}`);
        reject(err);
        return;
      }

      const child = spawn(process.execPath, [seedPath]);

      child.stdout.on("data", (data) => {
        const logMsg = data.toString();
        event.sender.send("seeder:log", logMsg);  // Still send for real-time
      });

      child.stderr.on("data", (data) => {
        const logMsg = "ERROR: " + data.toString();
        event.sender.send("seeder:log", logMsg);
      });

      child.on("close", (code) => {
        event.sender.send("seeder:finished", code);
        if (code === 0) {
          resolve({ success: true, code });  // Resolve on success
        } else {
          reject(new Error(`Seeder exited with code ${code}`));
        }
      });

      child.on("error", (err) => {
        event.sender.send("seeder:log", `SPAWN ERROR: ${err.message}`);
        reject(err);
      });
    } catch (err) {
      event.sender.send("seeder:log", `ERROR: ${err.message}`);
      reject(err);
    }
  });
});