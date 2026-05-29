import { ImageResponse } from "next/og";

// Tamanho padrão recomendado pelas redes (Facebook, WhatsApp, Twitter, LinkedIn)
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export const alt =
  "CaseFlow — portal jurídico para advogados e clientes acompanharem processos, documentos e mensagens";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background:
            "linear-gradient(135deg, #f0fdfa 0%, #ffffff 55%, #ffffff 100%)",
          padding: "72px",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {/* Marca no topo */}
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <svg width="64" height="64" viewBox="0 0 40 40">
            <rect width="40" height="40" rx="11" fill="#020617" />
            <path
              d="M11 27.5 L20 20.5 L29 12.5"
              fill="none"
              stroke="#2dd4bf"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="11" cy="27.5" r="2.6" fill="#5eead4" />
            <circle cx="20" cy="20.5" r="2.6" fill="#5eead4" />
            <circle cx="29" cy="12.5" r="4" fill="#ffffff" />
          </svg>
          <span
            style={{
              fontSize: 36,
              fontWeight: 600,
              letterSpacing: "-0.02em",
              color: "#020617",
            }}
          >
            CaseFlow
          </span>
        </div>

        {/* Bloco principal */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 20,
            maxWidth: 940,
          }}
        >
          <span
            style={{
              alignSelf: "flex-start",
              padding: "8px 16px",
              borderRadius: 999,
              background: "#fff",
              border: "1px solid #99f6e4",
              color: "#0f766e",
              fontSize: 18,
              fontWeight: 600,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
            }}
          >
            SaaS jurídico
          </span>
          <h1
            style={{
              fontSize: 72,
              fontWeight: 600,
              letterSpacing: "-0.02em",
              lineHeight: 1.05,
              color: "#020617",
              margin: 0,
            }}
          >
            Seu escritório no controle do processo.
          </h1>
          <p
            style={{
              fontSize: 30,
              lineHeight: 1.4,
              color: "#475569",
              margin: 0,
              maxWidth: 880,
            }}
          >
            Clientes, processos, documentos e mensagens em um só portal — sem
            cobrar atualização toda hora pelo WhatsApp.
          </p>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: 22, color: "#64748b" }}>
            caseflow.app
          </span>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 22,
              color: "#0f766e",
              fontWeight: 600,
            }}
          >
            <span
              style={{
                display: "flex",
                width: 10,
                height: 10,
                borderRadius: 999,
                background: "#14b8a6",
              }}
            />
            Pronto pra advogar
          </span>
        </div>
      </div>
    ),
    size
  );
}
