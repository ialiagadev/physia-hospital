// Cliente HTTP para VeriFactu API

import { VERIFACTU_CONFIG, validateVeriFactuConfig, type VeriFactuEndpoint } from "./config"
import type { VeriFactuErrorResponse, VeriFactuRequestOptions } from "./types"

export class VeriFactuClient {
  private baseUrl: string
  private defaultHeaders: Record<string, string>
  private accessToken?: string

  constructor(accessToken?: string) {
    try {
      validateVeriFactuConfig()
    } catch (error) {
      console.error("[VeriFactu Client] Error de configuración:", error)
      throw error
    }

    this.baseUrl = VERIFACTU_CONFIG.BASE_URL
    this.defaultHeaders = { ...VERIFACTU_CONFIG.DEFAULT_HEADERS }
    this.accessToken = accessToken
  }

  /**
   * Realizar petición HTTP a VeriFactu
   */
  async request<T = any>(endpoint: VeriFactuEndpoint | string, options: VeriFactuRequestOptions = {}): Promise<T> {
    const {
      method = "GET",
      body,
      headers = {},
      requiresAuth = false,
      timeout = VERIFACTU_CONFIG.TIMEOUT.DEFAULT,
      retries = VERIFACTU_CONFIG.RETRY.MAX_ATTEMPTS,
    } = options

    // Construir URL completa
    const endpointUrl = this.buildEndpointUrl(endpoint)
    const url = `${this.baseUrl}${endpointUrl}`

    // Preparar headers
    const requestHeaders: Record<string, string> = {
      ...this.defaultHeaders,
      ...headers,
    }

    // Agregar token de autorización si es necesario
    if (requiresAuth) {
      if (!this.accessToken) {
        throw new Error("Token de acceso requerido para esta operación")
      }
      requestHeaders.Authorization = `Bearer ${this.accessToken}`
    }

    // Preparar body
    let requestBody: string | undefined
    if (body) {
      if (typeof body === "object") {
        requestBody = JSON.stringify(body)
        requestHeaders["Content-Type"] = "application/json"
      } else {
        requestBody = body
      }
    }

    console.log(`[VeriFactu Client] ${method} ${url}`)

    // Función para realizar la petición
    const makeRequest = async (): Promise<T> => {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      try {
        const response = await fetch(url, {
          method,
          headers: requestHeaders,
          body: requestBody,
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        // Leer respuesta
        const responseText = await response.text()
        let responseData: any

        try {
          responseData = responseText ? JSON.parse(responseText) : {}
        } catch (parseError) {
          console.error("[VeriFactu Client] Error parsing JSON response:", parseError)
          responseData = { raw: responseText }
        }

        // Verificar si la respuesta es exitosa
        if (!response.ok) {
          const error: VeriFactuErrorResponse = {
            error: responseData.error || "HTTP_ERROR",
            error_description:
              responseData.error_description ||
              responseData.message ||
              `HTTP ${response.status}: ${response.statusText}`,
            message: responseData.message,
            code: responseData.code || response.status.toString(),
            details: responseData,
          }

          console.error(`[VeriFactu Client] Error ${response.status}:`, error)
          throw new Error(error.error_description || error.error)
        }

        console.log(`[VeriFactu Client] Success ${method} ${url}`)
        return responseData as T
      } catch (error) {
        clearTimeout(timeoutId)

        if (error instanceof Error) {
          if (error.name === "AbortError") {
            throw new Error(`Timeout: La petición a VeriFactu tardó más de ${timeout}ms`)
          }
          throw error
        }
        throw new Error("Error desconocido en petición a VeriFactu")
      }
    }

    // Implementar reintentos
    let lastError: Error
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await makeRequest()
      } catch (error) {
        lastError = error instanceof Error ? error : new Error("Error desconocido")

        if (attempt === retries) {
          break
        }

        // No reintentar en errores de autenticación o cliente
        if (
          lastError.message.includes("401") ||
          lastError.message.includes("403") ||
          lastError.message.includes("400")
        ) {
          break
        }

        const delay = VERIFACTU_CONFIG.RETRY.DELAY_MS * Math.pow(VERIFACTU_CONFIG.RETRY.BACKOFF_MULTIPLIER, attempt - 1)
        console.log(`[VeriFactu Client] Reintento ${attempt}/${retries} en ${delay}ms`)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }

    throw lastError!
  }

  /**
   * Construir URL del endpoint
   */
  private buildEndpointUrl(endpoint: VeriFactuEndpoint | string): string {
    if (endpoint in VERIFACTU_CONFIG.ENDPOINTS) {
      return VERIFACTU_CONFIG.ENDPOINTS[endpoint as VeriFactuEndpoint]
    }
    return endpoint
  }

  /**
   * Actualizar token de acceso
   */
  setAccessToken(token: string) {
    this.accessToken = token
  }

  /**
   * Obtener token actual
   */
  getAccessToken(): string | undefined {
    return this.accessToken
  }

  /**
   * Verificar si el cliente tiene token
   */
  hasAccessToken(): boolean {
    return !!this.accessToken
  }

  // Métodos de conveniencia para endpoints específicos
  async login(email: string, password: string) {
    return this.request(VERIFACTU_CONFIG.ENDPOINTS.LOGIN, {
      method: "POST",
      body: { email, password },
      timeout: VERIFACTU_CONFIG.TIMEOUT.LOGIN,
    })
  }

  async loginEmisor(username: string, api_key: string) {
    return this.request(VERIFACTU_CONFIG.ENDPOINTS.LOGIN_EMISOR, {
      method: "POST",
      body: { username, api_key },
      timeout: VERIFACTU_CONFIG.TIMEOUT.LOGIN,
    })
  }

  async crearEmisor(emisorData: any) {
    return this.request(VERIFACTU_CONFIG.ENDPOINTS.CREAR_EMISOR, {
      method: "POST",
      body: emisorData,
      requiresAuth: true,
    })
  }

  async obtenerCredenciales(emisorId: number) {
    const endpoint = VERIFACTU_CONFIG.ENDPOINTS.OBTENER_CREDENCIALES.replace("{id}", emisorId.toString())
    return this.request(endpoint, {
      method: "GET",
      requiresAuth: true,
    })
  }

  async registrarFactura(facturaData: any) {
    return this.request(VERIFACTU_CONFIG.ENDPOINTS.REGISTRAR_FACTURA, {
      method: "POST",
      body: facturaData,
      requiresAuth: true,
      timeout: VERIFACTU_CONFIG.TIMEOUT.UPLOAD,
    })
  }
}

/**
 * Factory function para crear cliente VeriFactu
 */
export function getVeriFactuClient(accessToken?: string): VeriFactuClient {
  return new VeriFactuClient(accessToken)
}

/**
 * Cliente singleton para operaciones sin autenticación
 */
let publicClient: VeriFactuClient | null = null

export function getPublicVeriFactuClient(): VeriFactuClient {
  if (!publicClient) {
    publicClient = new VeriFactuClient()
  }
  return publicClient
}

/**
 * Limpiar cliente singleton (útil para tests)
 */
export function clearClientCache(): void {
  publicClient = null
}
