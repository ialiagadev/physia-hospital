import { type NextRequest, NextResponse } from "next/server"
import { generateObject, generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { z } from "zod"
import * as XLSX from "xlsx"

// Schema para validar el mapeo de columnas
const ColumnMappingSchema = z.object({
  name: z.string().nullable(),
  tax_id: z.string().nullable(),
  address: z.string().nullable(),
  postal_code: z.string().nullable(),
  city: z.string().nullable(),
  province: z.string().nullable(),
  country: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  client_type: z.string().nullable(),
  birth_date: z.string().nullable(),
  gender: z.string().nullable(),
})

// Función para limpiar texto con problemas de encoding
function cleanText(text: string): string {
  if (!text) return text

  // Reemplazar caracteres con problemas de encoding comunes
  return text
    .replace(/Ã±/g, "ñ")
    .replace(/Ã¡/g, "á")
    .replace(/Ã©/g, "é")
    .replace(/Ã­/g, "í")
    .replace(/Ã³/g, "ó")
    .replace(/Ãº/g, "ú")
    .replace(/Ã/g, "Á")
    .replace(/Ã‰/g, "É")
    .replace(/Ã/g, "Í")
    .replace(/Ã"/g, "Ó")
    .replace(/Ãš/g, "Ú")
    .replace(/Ã'/g, "Ñ")
    .replace(/Ã§/g, "ç")
    .replace(/Ã¼/g, "ü")
    .replace(/â€™/g, "'")
    .replace(/â€œ/g, '"')
    .replace(/â€/g, '"')
    .replace(/â€"/g, "–")
    .replace(/â€"/g, "—")
    .trim()
}

// Función para normalizar teléfono (quitar espacios, guiones y paréntesis)
function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-()]/g, "").trim()
}

// Función para normalizar código postal
function normalizePostalCode(postalCode: string): string {
  // Limpiar caracteres especiales y espacios
  let cleaned = postalCode.replace(/[^\d]/g, "").trim()

  // Para códigos postales españoles (5 dígitos), añadir ceros a la izquierda si es necesario
  if (cleaned.length <= 5 && cleaned.length >= 3) {
    cleaned = cleaned.padStart(5, "0")
  }

  return cleaned
}

// Función para normalizar fecha de nacimiento
function normalizeBirthDate(dateStr: string): string | null {
  if (!dateStr) return null

  try {
    // Intentar varios formatos de fecha
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
function normalizeGender(gender: string): string | null {
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

// Función para validar formato de Tax ID internacional (más flexible)
function isValidTaxId(taxId: string): boolean {
  // Debe tener al menos 3 caracteres y máximo 20
  if (taxId.length < 3 || taxId.length > 20) {
    return false
  }

  // Patrones para diferentes países
  const patterns = [
    // España: NIF/CIF/NIE
    /^[A-Z]?\d{8}[A-Z]?$/,
    // Francia: SIREN/SIRET
    /^\d{9}(\d{5})?$/,
    // Reino Unido: Company Number
    /^[A-Z]{2}\d{6}$|^\d{8}$/,
    // Alemania: Steuernummer
    /^\d{10,11}$/,
    // Italia: Codice Fiscale
    /^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/,
    // Estados Unidos: EIN
    /^\d{2}-?\d{7}$/,
    // Genérico: Solo letras y números
    /^[A-Z0-9]+$/,
  ]

  return patterns.some((pattern) => pattern.test(taxId.toUpperCase()))
}

// Función para validar teléfono
function isValidPhone(phone: string): boolean {
  const cleanPhone = normalizePhone(phone)
  // Debe tener al menos 6 dígitos y máximo 20
  return cleanPhone.length >= 6 && cleanPhone.length <= 20 && /^\+?[\d]+$/.test(cleanPhone)
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No se proporcionó ningún archivo" }, { status: 400 })
    }

    // Leer el archivo con mejor manejo de encoding
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, {
      type: "buffer",
      codepage: 65001, // UTF-8
      cellText: false,
      cellDates: true,
    })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]

    // Convertir a JSON con mejor manejo de texto
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: "",
      blankrows: false,
    }) as string[][]

    if (jsonData.length === 0) {
      return NextResponse.json({ error: "El archivo está vacío" }, { status: 400 })
    }

    // Obtener las cabeceras (primera fila) y limpiar encoding
    const headers = jsonData[0].map((header) => cleanText(header?.toString() || ""))
    const dataRows = jsonData.slice(1).filter((row) => row.some((cell) => cell && cell.toString().trim() !== ""))

    if (dataRows.length === 0) {
      return NextResponse.json({ error: "No se encontraron datos válidos en el archivo" }, { status: 400 })
    }

    // Crear un prompt para que la IA analice las cabeceras
    const headersText = headers.join(", ")
    const sampleRows = dataRows
      .slice(0, 3)
      .map((row) => headers.map((header, index) => `${header}: ${cleanText(row[index]?.toString() || "")}`).join(", "))
      .join("\n")

    const prompt = `
Analiza las siguientes cabeceras de un archivo Excel/CSV y mapéalas a los campos estándar de cliente:

Cabeceras disponibles: ${headersText}

Muestra de datos:
${sampleRows}

Mapea cada cabecera a uno de estos campos estándar (o null si no corresponde):
- name: Nombre del cliente, empresa, razón social, nombre completo
- tax_id: CIF, NIF, DNI, identificación fiscal, documento de identidad, tax ID, VAT number
- address: Dirección, domicilio, calle
- postal_code: Código postal, CP, ZIP code
- city: Ciudad, localidad, municipio
- province: Provincia, estado, region, state
- country: País, nacionalidad, country
- email: Correo electrónico, email, mail
- phone: Teléfono, móvil, celular, contacto
- client_type: Tipo de cliente (private/public), sector (público/privado)
- birth_date: Fecha de nacimiento, nacimiento, fecha nac, birth date, date of birth
- gender: Género, sexo, gender, sex (masculino/femenino/otro)

Devuelve el mapeo de cada campo estándar a la cabecera original correspondiente.
Si una cabecera puede corresponder a múltiples campos, elige el más apropiado.
`

    // Usar IA para mapear las columnas
    const { object: mapping } = await generateObject({
      model: openai("gpt-4o"),
      prompt,
      schema: ColumnMappingSchema,
    })

    // Procesar los datos usando el mapeo
    const processedData: any[] = []
    const invalidRows: string[] = []
    const duplicateTracker = new Set<string>() // Para detectar duplicados por Tax ID
    const phoneTracker = new Set<string>() // Para detectar duplicados por teléfono
    let duplicateCount = 0

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i]
      const client: any = {}
      const rowNumber = i + 2 // +2 porque empezamos desde la fila 1 y las filas en Excel empiezan en 1

      // Mapear cada campo usando el mapeo de IA
      Object.entries(mapping).forEach(([standardField, originalHeader]) => {
        if (originalHeader) {
          const columnIndex = headers.indexOf(originalHeader)
          if (columnIndex !== -1 && row[columnIndex]) {
            let value = cleanText(row[columnIndex].toString().trim())

            // Procesar campos específicos
            if (standardField === "tax_id" && value) {
              // Mantener normalización básica del tax_id
              value = value.replace(/[-\s]/g, "").toUpperCase().trim()
            } else if (standardField === "phone" && value) {
              value = normalizePhone(value)
            } else if (standardField === "postal_code" && value) {
              value = normalizePostalCode(value)
            } else if (standardField === "client_type" && value) {
              const lowerValue = value.toLowerCase()
              value =
                lowerValue.includes("público") ||
                lowerValue.includes("public") ||
                lowerValue.includes("ayuntamiento") ||
                lowerValue.includes("gobierno") ||
                lowerValue.includes("administracion") ||
                lowerValue.includes("administración")
                  ? "public"
                  : "private"
            } else if (standardField === "birth_date" && value) {
              const normalizedDate = normalizeBirthDate(value)
              value = normalizedDate || ""
            } else if (standardField === "gender" && value) {
              const normalizedGender = normalizeGender(value)
              value = normalizedGender || ""
            }

            if (value && value !== "") {
              client[standardField] = value
            }
          }
        }
      })

      // Validar campos obligatorios
      if (!client.name || !client.tax_id) {
        invalidRows.push(`Fila ${rowNumber}: Faltan campos obligatorios (nombre o identificación fiscal)`)
        continue
      }

      // NUEVA VALIDACIÓN: Teléfono obligatorio
      if (!client.phone) {
        invalidRows.push(`Fila ${rowNumber}: El teléfono es obligatorio`)
        continue
      }

      // Validar formato de Tax ID (más flexible para clientes internacionales)
      if (!isValidTaxId(client.tax_id)) {
        invalidRows.push(`Fila ${rowNumber}: La identificación fiscal "${client.tax_id}" no tiene un formato válido`)
        continue
      }

      // Validar formato de teléfono
      if (!isValidPhone(client.phone)) {
        invalidRows.push(`Fila ${rowNumber}: El teléfono "${client.phone}" no tiene un formato válido`)
        continue
      }

      // Detectar duplicados por Tax ID
      if (duplicateTracker.has(client.tax_id)) {
        invalidRows.push(`Fila ${rowNumber}: La identificación fiscal "${client.tax_id}" está duplicada en el archivo`)
        duplicateCount++
        continue
      }
      duplicateTracker.add(client.tax_id)

      // Detectar duplicados por teléfono
      if (phoneTracker.has(client.phone)) {
        invalidRows.push(`Fila ${rowNumber}: El teléfono "${client.phone}" está duplicado en el archivo`)
        duplicateCount++
        continue
      }
      phoneTracker.add(client.phone)

      // Aplicar valores por defecto
      client.country = client.country || "España"
      client.client_type = client.client_type || "private"

      // Limpiar campos opcionales
      Object.keys(client).forEach((key) => {
        if (client[key] === "" || client[key] === null || client[key] === undefined) {
          client[key] = null
        }
      })

      processedData.push(client)
    }

    // Lookup de códigos postales a ciudades usando IA (con generateText)
    if (processedData.length > 0) {
      // Obtener códigos postales únicos que NO tengan ciudad o tengan ciudad vacía/null
      const postalCodesNeedingCity = processedData
        .filter((client) => {
          const hasPostalCode = client.postal_code && client.postal_code.toString().trim() !== ""
          const needsCity = !client.city || client.city === null || client.city.toString().trim() === ""
          return hasPostalCode && needsCity
        })
        .map((client) => client.postal_code.toString().trim())

      const uniquePostalCodes = [...new Set(postalCodesNeedingCity)]

      if (uniquePostalCodes.length > 0) {
        try {
          const postalCodePrompt = `
Eres un experto en códigos postales españoles e internacionales. 
Analiza estos códigos postales y devuelve la ciudad correspondiente para cada uno:

Códigos postales: ${uniquePostalCodes.join(", ")}

INSTRUCCIONES:
1. Para códigos postales españoles (5 dígitos):
   - Los que empiezan por 03 son de la provincia de Alicante
   - Los que empiezan por 28 son de la provincia de Madrid
   - Los que empiezan por 08 son de la provincia de Barcelona
   - Los que empiezan por 46 son de la provincia de Valencia
   - Los que empiezan por 41 son de la provincia de Sevilla
   - Los que empiezan por 48 son de la provincia de Vizcaya
   - Los que empiezan por 29 son de la provincia de Málaga
   - Los que empiezan por 15 son de la provincia de A Coruña
   - Los que empiezan por 30 son de la provincia de Murcia
   - Los que empiezan por 12 son de la provincia de Castellón
   - Y así sucesivamente según el sistema postal español

2. Para códigos postales internacionales, usa tu conocimiento general

3. Si no estás seguro de un código postal, no lo incluyas en la respuesta

4. Devuelve SOLO un objeto JSON válido sin explicaciones adicionales

Formato de respuesta:
{"03010": "Alicante", "28001": "Madrid", "08001": "Barcelona"}

IMPORTANTE: Solo incluye códigos postales que reconozcas con alta certeza.
`

          const { text } = await generateText({
            model: openai("gpt-4o"),
            prompt: postalCodePrompt,
          })

          // Intentar parsear la respuesta JSON
          let cityMapping: Record<string, string> = {}
          try {
            // Limpiar la respuesta para extraer solo el JSON
            const jsonMatch = text.match(/\{[\s\S]*\}/)
            if (jsonMatch) {
              cityMapping = JSON.parse(jsonMatch[0])
            } else {
              // Intentar parsear directamente
              cityMapping = JSON.parse(text.trim())
            }
          } catch (parseError) {
            // Intentar extraer manualmente si el JSON está mal formateado
            try {
              const lines = text.split("\n")
              const jsonLine = lines.find((line) => line.trim().startsWith("{"))
              if (jsonLine) {
                cityMapping = JSON.parse(jsonLine.trim())
              }
            } catch (secondParseError) {
              // Silenciar errores de parseo
            }
          }

          // Aplicar el mapeo de ciudades a los datos
          processedData.forEach((client) => {
            const postalCode = client.postal_code?.toString().trim()
            const needsCity = !client.city || client.city === null || client.city.toString().trim() === ""

            if (postalCode && needsCity && cityMapping[postalCode]) {
              client.city = cityMapping[postalCode]
            }
          })
        } catch (error) {
          // No es crítico, continúa sin las ciudades
        }
      }
    }

    return NextResponse.json({
      mapping,
      data: processedData,
      invalidCount: invalidRows.length,
      totalRows: dataRows.length,
      headers,
      errors: invalidRows,
      duplicateCount,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: `Error al procesar el archivo con IA: ${error instanceof Error ? error.message : "Error desconocido"}`,
      },
      { status: 500 },
    )
  }
}
    