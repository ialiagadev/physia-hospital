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
  birth_date?: string
  gender?: "male" | "female" | "other"
}

export interface ParseResult {
  data: ClientImportData[]
  errors: string[]
  totalRows: number
}

// Función para normalizar NIF/CIF
function normalizeTaxId(taxId: string): string {
  return taxId.replace(/[-\s]/g, "").toUpperCase().trim()
}

// Función para normalizar teléfono
function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-()]/g, "").trim()
}

// Función para normalizar fecha de nacimiento
function normalizeBirthDate(dateStr: string): string | null {
  if (!dateStr) return null

  try {
    const cleanDate = dateStr.toString().trim()

    // Si es un número (Excel serial date)
    if (!isNaN(Number(cleanDate))) {
      const excelDate = new Date((Number(cleanDate) - 25569) * 86400 * 1000)
      if (excelDate.getFullYear() > 1900 && excelDate.getFullYear() < 2100) {
        return excelDate.toISOString().split("T")[0]
      }
    }

    // Intentar parsear como fecha normal
    const date = new Date(cleanDate)
    if (!isNaN(date.getTime()) && date.getFullYear() > 1900 && date.getFullYear() < 2100) {
      return date.toISOString().split("T")[0]
    }

    // Intentar formato DD/MM/YYYY o DD-MM-YYYY
    const dateRegex = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/
    const match = cleanDate.match(dateRegex)
    if (match) {
      const [, day, month, year] = match
      const parsedDate = new Date(Number.parseInt(year), Number.parseInt(month) - 1, Number.parseInt(day))
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate.toISOString().split("T")[0]
      }
    }

    return null
  } catch {
    return null
  }
}

// Función para normalizar género
function normalizeGender(gender: string): "male" | "female" | "other" | null {
  if (!gender) return null

  const cleanGender = gender.toString().toLowerCase().trim()

  if (
    cleanGender.includes("masculino") ||
    cleanGender.includes("hombre") ||
    cleanGender === "m" ||
    cleanGender === "male"
  ) {
    return "male"
  }

  if (
    cleanGender.includes("femenino") ||
    cleanGender.includes("mujer") ||
    cleanGender === "f" ||
    cleanGender === "female"
  ) {
    return "female"
  }

  if (cleanGender.includes("otro") || cleanGender === "other" || cleanGender === "o") {
    return "other"
  }

  return null
}

export async function parseFile(file: File): Promise<ParseResult> {
  const errors: string[] = []
  const data: ClientImportData[] = []

  try {
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: "buffer" })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]

    // Convertir a JSON con headers
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][]

    if (jsonData.length === 0) {
      errors.push("El archivo está vacío")
      return { data, errors, totalRows: 0 }
    }

    const headers = jsonData[0] as string[]
    const dataRows = jsonData.slice(1)

    // Mapeo esperado de columnas (case insensitive)
    const columnMapping: Record<string, keyof ClientImportData> = {
      nombre: "name",
      "nombre o razón social": "name",
      "razón social": "name",
      "cif/nif": "tax_id",
      cif: "tax_id",
      nif: "tax_id",
      dni: "tax_id",
      direccion: "address",
      dirección: "address",
      "codigo postal": "postal_code",
      "código postal": "postal_code",
      cp: "postal_code",
      ciudad: "city",
      localidad: "city",
      provincia: "province",
      pais: "country",
      país: "country",
      email: "email",
      "correo electrónico": "email",
      telefono: "phone",
      teléfono: "phone",
      movil: "phone",
      móvil: "phone",
      "tipo cliente": "client_type",
      "tipo de cliente": "client_type",
      "fecha de nacimiento": "birth_date",
      "fecha nacimiento": "birth_date",
      nacimiento: "birth_date",
      "birth date": "birth_date",
      genero: "gender",
      género: "gender",
      sexo: "gender",
      gender: "gender",
    }

    // Crear mapeo de índices
    const fieldIndexes: Record<keyof ClientImportData, number> = {} as any

    headers.forEach((header, index) => {
      const normalizedHeader = header.toLowerCase().trim()
      const field = columnMapping[normalizedHeader]
      if (field) {
        fieldIndexes[field] = index
      }
    })

    // Procesar cada fila
    dataRows.forEach((row, index) => {
      const rowNumber = index + 2 // +2 porque empezamos desde la fila 1 y las filas en Excel empiezan en 1

      // Verificar que la fila no esté vacía
      if (!row.some((cell) => cell && cell.toString().trim() !== "")) {
        return // Saltar filas vacías
      }

      const client: Partial<ClientImportData> = {}

      // Extraer datos según el mapeo
      Object.entries(fieldIndexes).forEach(([field, columnIndex]) => {
        const value = row[columnIndex]
        if (value && value.toString().trim() !== "") {
          let processedValue = value.toString().trim()

          // Procesar campos específicos
          if (field === "tax_id") {
            processedValue = normalizeTaxId(processedValue)
          } else if (field === "phone") {
            processedValue = normalizePhone(processedValue)
          } else if (field === "client_type") {
            const lowerValue = processedValue.toLowerCase()
            processedValue =
              lowerValue.includes("público") ||
              lowerValue.includes("public") ||
              lowerValue.includes("ayuntamiento") ||
              lowerValue.includes("gobierno")
                ? "public"
                : "private"
          } else if (field === "birth_date") {
            const normalizedDate = normalizeBirthDate(processedValue)
            if (normalizedDate) {
              processedValue = normalizedDate
            } else {
              errors.push(`Fila ${rowNumber}: Fecha de nacimiento inválida "${processedValue}"`)
              return
            }
          } else if (field === "gender") {
            const normalizedGender = normalizeGender(processedValue)
            if (normalizedGender) {
              processedValue = normalizedGender
            } else {
              errors.push(`Fila ${rowNumber}: Género inválido "${processedValue}"`)
              return
            }
          }
          ;(client as any)[field] = processedValue
        }
      })

      // Validar campos obligatorios
      if (!client.name) {
        errors.push(`Fila ${rowNumber}: Falta el nombre del cliente`)
        return
      }

      if (!client.tax_id) {
        errors.push(`Fila ${rowNumber}: Falta el CIF/NIF`)
        return
      }

      // Aplicar valores por defecto
      client.country = client.country || "España"
      client.client_type = client.client_type || "private"

      data.push(client as ClientImportData)
    })

    return {
      data,
      errors,
      totalRows: dataRows.length,
    }
  } catch (error) {
    errors.push(`Error al procesar el archivo: ${error instanceof Error ? error.message : "Error desconocido"}`)
    return { data, errors, totalRows: 0 }
  }
}
