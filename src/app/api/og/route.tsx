import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const topic = req.nextUrl.searchParams.get("topic") || "Any Topic";
  
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0a0a0f",
          fontFamily: "Inter, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "20px",
          }}
        >
          <div
            style={{
              width: "12px",
              height: "12px",
              borderRadius: "50%",
              backgroundColor: "#10b981",
            }}
          />
          <span style={{ color: "#71717a", fontSize: "18px" }}>
            Real-time intelligence
          </span>
        </div>
        
        <div
          style={{
            fontSize: "64px",
            fontWeight: "bold",
            color: "white",
            textAlign: "center",
            lineHeight: 1.2,
            marginBottom: "16px",
          }}
        >
          PulseBoard
        </div>
        
        <div
          style={{
            fontSize: "36px",
            color: "#7c3aed",
            textAlign: "center",
            marginBottom: "24px",
          }}
        >
          {topic}
        </div>
        
        <div
          style={{
            display: "flex",
            gap: "24px",
            color: "#71717a",
            fontSize: "16px",
          }}
        >
          <span>● Reddit</span>
          <span>● Hacker News</span>
          <span>● Google News</span>
          <span>● AI Analysis</span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
