import type { NextRequest } from "next/server"

export async function HEAD(req: NextRequest) {
  try {
    // Verificar conectividad básica con VeriFactu
    const response = await fetch("https://app.verifactuapi.es/api/ping", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      // Timeout corto para health check
      signal: AbortSignal.timeout(5000),
    })

    if (response.ok) {
      return new Response(null, { status: 200 })
    } else {
      return new Response(null, { status: 503 })
    }
  } catch (error) {
    console.error("VeriFactu health check failed:", error)
    return new Response(null, { status: 503 })
  }
}

export async function GET(req: NextRequest) {
  return HEAD(req)
}
