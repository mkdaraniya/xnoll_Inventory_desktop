// src/pages/Settings/CodeGenerator.jsx
import React, { useState } from "react";

function CodeGenerator() {
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState("");  // Will append lines

  const appendLog = (newLog) => {
    setLog((prev) => prev + (prev ? "\n" : "") + newLog);
  };

  const runSeeder = async () => {
    if (loading) return;
    setLoading(true);
    setLog("Running seeder... please wait.\n");  // Initial log

    // Subscribe to real-time logs
    const logCleanup = window.xnoll.onSeederLog(appendLog);
    const finishedCleanup = window.xnoll.onSeederFinished((code) => {
      const finalMsg = code === 0 ? "Seeder completed successfully!" : `Seeder failed with code ${code}`;
      appendLog(finalMsg);
      setLoading(false);
      // Clean up listeners after delay
      setTimeout(() => {
        logCleanup();
        finishedCleanup();
      }, 1000);
    });

    try {
      const result = await window.api.runSeeder();  // Now awaits the promise
      if (result?.success) {
        appendLog("✅ Data generation complete. Refresh Dashboard to see changes.");
      } else {
        appendLog("❌ Seeder failed. Check logs above.");
      }
    } catch (err) {
      appendLog(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
      // Ensure cleanup
      logCleanup();
      finishedCleanup();
    }
  };

  if (import.meta.env.MODE !== "development") {
    return null; // hide in production
  }

  return (
    <div style={{ padding: "20px" }}>
      <h2>Developer Tools</h2>

      <button
        onClick={runSeeder}
        disabled={loading}
        style={{
          padding: "10px 20px",
          background: loading ? "#999" : "#28a745",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: loading ? "not-allowed" : "pointer",
          marginTop: "10px"
        }}
      >
        {loading ? "Generating Dummy Data..." : "Generate Dummy Data"}
      </button>

      <pre style={{ marginTop: "20px", background: "#f4f4f4", padding: "15px", maxHeight: "400px", overflowY: "auto" }}>
        {log || "Click button to start..."}
      </pre>
    </div>
  );
}

export default CodeGenerator;