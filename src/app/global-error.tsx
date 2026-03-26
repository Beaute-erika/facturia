"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <html lang="fr">
      <body
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          fontFamily: "sans-serif",
          background: "#0f172a",
          color: "#f1f5f9",
          margin: 0,
        }}
      >
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>
            Une erreur est survenue
          </h1>
          <p style={{ color: "#94a3b8", marginBottom: "1.5rem", fontSize: "0.875rem" }}>
            Veuillez recharger la page. Si le problème persiste, contactez le support.
          </p>
          <button
            onClick={reset}
            style={{
              background: "#6366f1",
              color: "#fff",
              border: "none",
              borderRadius: "0.75rem",
              padding: "0.625rem 1.5rem",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: 600,
            }}
          >
            Recharger
          </button>
        </div>
      </body>
    </html>
  );
}
