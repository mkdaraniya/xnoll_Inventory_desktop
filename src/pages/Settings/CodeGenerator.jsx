import React, { useState } from "react";

function CodeGenerator() {
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState("");

  const runSeeder = async () => {
    setLoading(true);
    setLog("Running seeder... please wait.");
    const result = await window.api.runSeeder();
    setLog(result);
    setLoading(false);
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

      <pre style={{ marginTop: "20px", background: "#f4f4f4", padding: "15px" }}>
        {log}
      </pre>
    </div>
  );
}

export default CodeGenerator;
