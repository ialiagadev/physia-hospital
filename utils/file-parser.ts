import * as XLSX from "xlsx"

export interface ClientImportData {
  name: string
  tax_id: string
  address?: string
  postal_code?: string
  city?: string
  province?: string
  country?: string
  email?: string
  phone?: string
  client_type?: "private" | "public"
}

export interface ParseResult {
  data: ClientImportData[]
  errors: string[]
  totalRows: number
}

// Mapeo de posibles nombres de columnas
const COLUMN_MAPPING: Record<string, string> = {
  // Nombre (incluyendo con asterisco)
  nombre: "name",
  "nombre*": "name",
  name: "name",
  "name*": "name",
  "razon social": "name",
  "razón social": "name",
  empresa: "name",
  "client name": "name",

  // Tax ID (incluyendo con asterisco)
  cif: "tax_id",
  "cif*": "tax_id",
  nif: "tax_id",
  "nif*": "tax_id",
  "cif/nif": "tax_id",
  "cif/nif*": "tax_id",
  tax_id: "tax_id",
  "tax_id*": "tax_id",
  identificacion: "tax_id",
  identificación: "tax_id",

  // Dirección
  direccion: "address",
  dirección: "address",
  address: "address",

  // Código postal
  "codigo postal": "postal_code",
  "código postal": "postal_code",
  cp: "postal_code",
  postal_code: "postal_code",
  zip: "postal_code",

  // Ciudad
  ciudad: "city",
  city: "city",

  // Provincia
  provincia: "province",
  province: "province",

  // País
  pais: "country",
  país: "country",
  country: "country",

  // Email
  email: "email",
  correo: "email",
  mail: "email",

  // Teléfono
  telefono: "phone",
  teléfono: "phone",
  phone: "phone",
  movil: "phone",
  móvil: "phone",

  // Tipo de cliente
  tipo: "client_type",
  "tipo cliente": "client_type",
  client_type: "client_type",
  type: "client_type",
}

function normalizeColumnName(columnName: string): string {
  const normalized = columnName.toLowerCase().trim().replace(/\*/g, "")
  return COLUMN_MAPPING[normalized] || COLUMN_MAPPING[columnName.toLowerCase().trim()] || columnName
}

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

function validateTaxId(taxId: string): boolean {
  // Validación básica para CIF/NIF español
  const taxIdRegex = /^[A-Z]?\d{8}[A-Z]?$/
  return taxIdRegex.test(taxId.toUpperCase())
}

// Parser CSV más simple y robusto
function parseCSVLine(line: string): string[] {
  // Usar una expresión regular más simple para dividir por comas
  // pero respetando las comillas
  const result: string[] = []
  const regex = /("([^"]|"")*"|[^,]*)(,|$)/g
  let match

  while ((match = regex.exec(line)) !== null) {
    let value = match[1]
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1).replace(/""/g, '"')
    }
    result.push(value.trim())
    if (match[3] === "") break // Final de línea
  }

  return result
}

export async function parseFile(file: File): Promise<ParseResult> {
  const errors: string[] = []
  const data: ClientImportData[] = []

  try {
    let jsonData: any[] = []

    if (file.name.endsWith(".csv")) {
      // Parsear CSV
      const text = await file.text()
      const lines = text.split(/\r?\n/).filter((line) => line.trim())

      if (lines.length < 2) {
        errors.push("El archivo CSV debe tener al menos una fila de encabezados y una fila de datos")
        return { data: [], errors, totalRows: 0 }
      }

      const headers = parseCSVLine(lines[0])
      console.log("Headers encontrados:", headers) // Debug

      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i])
        const row: any = {}

        headers.forEach((header, index) => {
          row[header] = values[index] || ""
        })

        jsonData.push(row)
      }
    } else {
      // Parsear Excel
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: "array" })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      jsonData = XLSX.utils.sheet_to_json(worksheet)
    }

    console.log("Datos parseados:", jsonData) // Debug

    // Procesar cada fila
    jsonData.forEach((row, index) => {
      const rowNumber = index + 2 // +2 porque empezamos en fila 1 y los arrays en 0
      const normalizedRow: any = {}

      console.log(`Procesando fila ${rowNumber}:`, row) // Debug

      // Normalizar nombres de columnas
      Object.keys(row).forEach((key) => {
        const normalizedKey = normalizeColumnName(key)
        normalizedRow[normalizedKey] = row[key]
        console.log(`Mapeo: "${key}" -> "${normalizedKey}" = "${row[key]}"`) // Debug
      })

      console.log("Fila normalizada:", normalizedRow) // Debug

      // Validar campos obligatorios
      if (!normalizedRow.name || normalizedRow.name.toString().trim() === "") {
        errors.push(`Fila ${rowNumber}: El nombre es obligatorio (valor recibido: "${normalizedRow.name}")`)
        return
      }

      if (!normalizedRow.tax_id || normalizedRow.tax_id.toString().trim() === "") {
        errors.push(`Fila ${rowNumber}: El CIF/NIF es obligatorio (valor recibido: "${normalizedRow.tax_id}")`)
        return
      }

      // Validar formato de tax_id
      const taxId = normalizedRow.tax_id.toString().trim().toUpperCase()
      if (!validateTaxId(taxId)) {
        errors.push(`Fila ${rowNumber}: El CIF/NIF "${taxId}" no tiene un formato válido`)
        return
      }

      // Validar email si está presente
      if (normalizedRow.email && normalizedRow.email.toString().trim() !== "") {
        const email = normalizedRow.email.toString().trim()
        if (!validateEmail(email)) {
          errors.push(`Fila ${rowNumber}: El email "${email}" no es válido`)
          return
        }
      }

      // Validar tipo de cliente
      let clientType: "private" | "public" = "private"
      if (normalizedRow.client_type) {
        const type = normalizedRow.client_type.toString().toLowerCase().trim()
        if (
          type === "public" ||
          type === "público" ||
          type === "publica" ||
          type === "pública" ||
          type === "administracion" ||
          type === "administración"
        ) {
          clientType = "public"
        }
      }

      // Crear objeto de cliente
      const clientData: ClientImportData = {
        name: normalizedRow.name.toString().trim(),
        tax_id: taxId,
        address: normalizedRow.address?.toString().trim() || undefined,
        postal_code: normalizedRow.postal_code?.toString().trim() || undefined,
        city: normalizedRow.city?.toString().trim() || undefined,
        province: normalizedRow.province?.toString().trim() || undefined,
        country: normalizedRow.country?.toString().trim() || "España",
        email: normalizedRow.email?.toString().trim() || undefined,
        phone: normalizedRow.phone?.toString().trim() || undefined,
        client_type: clientType,
      }

      data.push(clientData)
    })
  } catch (error) {
    errors.push(`Error al procesar el archivo: ${error instanceof Error ? error.message : "Error desconocido"}`)
  }

  return {
    data,
    errors,
    totalRows: data.length + errors.length,
  }
}
