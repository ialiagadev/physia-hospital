import { type NextRequest, NextResponse } from "next/server"
import { generateObject, generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { z } from "zod"
import * as XLSX from "xlsx"
import { parsePhoneNumberFromString } from "libphonenumber-js"

// Schema para validar el mapeo de columnas
const ColumnMappingSchema = z.object({
  name: z.string().nullable(),
  last_name: z.string().nullable(),
  tax_id: z.string().nullable(),
  address: z.string().nullable(),
  postal_code: z.string().nullable(),
  city: z.string().nullable(),
  province: z.string().nullable(),
  country: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  phone_prefix: z.string().nullable(),
  client_type: z.string().nullable(),
  birth_date: z.string().nullable(),
  gender: z.string().nullable(),
})

function extractPhoneAndPrefix(phone: string): {
  phone: string
  prefix: string
  isValid: boolean
} {
  if (!phone) return { phone: "", prefix: "+34", isValid: false }

  const parsed = parsePhoneNumberFromString(phone, "ES") // "ES" = España por defecto

  if (parsed) {
    return {
      phone: parsed.nationalNumber,             // 👈 solo el número limpio
      prefix: `+${parsed.countryCallingCode}`,  // 👈 prefijo internacional
      isValid: parsed.isValid(),
    }
  }

  // fallback si no se puede parsear
  return {
    phone: phone.replace(/\D/g, ""),
    prefix: "+34",
    isValid: false,
  }
}

// Función para limpiar texto con problemas de encoding
function cleanText(text: string): string {
  if (!text) return text

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

// Función para normalizar código postal
function normalizePostalCode(postalCode: string): string {
  let cleaned = postalCode.replace(/[^\d]/g, "").trim()

  if (cleaned.length <= 5 && cleaned.length >= 3) {
    cleaned = cleaned.padStart(5, "0")
  }

  return cleaned
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

function isValidTaxId(taxId: string): boolean {
  if (!taxId || taxId.trim() === "") {
    return true
  }

  // Validación básica: solo letras y números, longitud razonable
  return /^[A-Z0-9]{3,20}$/i.test(taxId.trim())
}

// Función para generar CSV de errores
function generateErrorCSV(invalidRows: string[], headers: string[], originalData: string[][]): string {
  const csvHeaders = ["Fila", "Error", ...headers]
  const csvRows = [csvHeaders.join(",")]

  invalidRows.forEach((error) => {
    const rowMatch = error.match(/Fila (\d+):/)
    if (rowMatch) {
      const rowNumber = Number.parseInt(rowMatch[1])
      const originalRowIndex = rowNumber - 2 // Ajustar índice
      const originalRow = originalData[originalRowIndex] || []
      const errorDescription = error.replace(/Fila \d+: /, "")
      const csvRow = [
        rowNumber.toString(),
        `"${errorDescription}"`,
        ...originalRow.map((cell) => `"${cleanText(cell?.toString() || "")}"`),
      ]
      csvRows.push(csvRow.join(","))
    }
  })

  return csvRows.join("\n")
}

function isValidPhone(phone: string): boolean {
  const cleanPhone = phone.replace(/[\s\-()]/g, "").trim()

  // Debe tener entre 6 y 20 caracteres y solo números (después del prefijo)
  if (cleanPhone.startsWith("+")) {
    const phoneWithoutPrefix = cleanPhone.substring(1).replace(/^\d{1,4}/, "")
    return phoneWithoutPrefix.length >= 6 && phoneWithoutPrefix.length <= 15 && /^\d+$/.test(phoneWithoutPrefix)
  }

  return cleanPhone.length >= 9 && cleanPhone.length <= 15 && /^\d+$/.test(cleanPhone)
}

function normalizePhoneForDuplicateCheck(phone: string, prefix: string): string {
  const cleanPhone = phone.replace(/[\s\-()]/g, "").trim()
  const cleanPrefix = prefix.startsWith("+") ? prefix : `+${prefix}`
  return `${cleanPrefix}${cleanPhone}`
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

    const prompt = `Analiza las siguientes cabeceras de un archivo Excel/CSV y mapéalas a los campos estándar de cliente:

Cabeceras disponibles: ${headersText}

Muestra de datos:
${sampleRows}

Mapea cada cabecera a uno de estos campos estándar (o null si no corresponde):
- name: Nombre del cliente, empresa, razón social, nombre (sin apellidos)
- last_name: Apellidos, apellido, surname, last name
- tax_id: CIF, NIF, DNI, identificación fiscal, documento de identidad, tax ID, VAT number
- address: Dirección, domicilio, calle
- postal_code: Código postal, CP, ZIP code
- city: Ciudad, localidad, municipio
- province: Provincia, estado, region, state
- country: País, nacionalidad, country
- email: Correo electrónico, email, mail
- phone: Teléfono, móvil, celular, contacto, phone number
- phone_prefix: Prefijo telefónico, código país, country code, phone prefix (ej: +34, +1, +33)
- client_type: Tipo de cliente (private/public), sector (público/privado)
- birth_date: Fecha de nacimiento, nacimiento, fecha nac, birth date, date of birth
- gender: Género, sexo, gender, sex (masculino/femenino/otro)

IMPORTANTE: 
- Si hay campos separados para nombre y apellidos, mapéalos por separado
- Si hay un campo de nombre completo, mapéalo solo a 'name'
- Si hay un campo específico para prefijo telefónico, mapéalo a 'phone_prefix'
- Si el teléfono incluye prefijo internacional, se extraerá automáticamente

Devuelve el mapeo de cada campo estándar a la cabecera original correspondiente.`

    // Usar IA para mapear las columnas
    const { object: mapping } = await generateObject({
      model: openai("gpt-4o"),
      prompt,
      schema: ColumnMappingSchema,
    })

    // Procesar los datos usando el mapeo
    const processedData: any[] = []
    const invalidRows: string[] = []
    const phoneTracker = new Set<string>() // Para detectar duplicados por teléfono completo
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
              value = value.replace(/[-\s]/g, "").toUpperCase().trim()
              // Si está vacío después de limpiar, asignar null
              if (value === "") {
                client.tax_id = null
              } else {
                client.tax_id = value
              }
              return
            } else if (standardField === "phone") {
              if (value && value.trim() !== "") {
                const phoneResult = extractPhoneAndPrefix(value)
                client.phone = phoneResult.phone
                client.phone_prefix = phoneResult.prefix
                client.phone_is_valid = phoneResult.isValid

                // Solo asignar prefijo si no se mapeó específicamente
                if (!mapping.phone_prefix) {
                  client.phone_prefix = phoneResult.prefix
                }
              } else {
                // Si no hay teléfono, asignar valores vacíos
                client.phone = ""
                client.phone_prefix = "+34"
                client.phone_is_valid = false
              }
              return // Salir temprano para evitar sobrescribir
            } else if (standardField === "phone_prefix" && value) {
              // Normalizar prefijo
              if (!value.startsWith("+")) {
                value = "+" + value.replace(/[^\d]/g, "")
              }
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

      if (!client.hasOwnProperty("tax_id")) {
        client.tax_id = null
      }

      // Combinar nombre y apellidos si ambos existen
      if (client.name && client.last_name) {
        client.name = `${client.name} ${client.last_name}`.trim()
        delete client.last_name // Eliminar el campo apellidos después de combinarlo
      } else if (client.last_name && !client.name) {
        // Si solo hay apellidos, usarlos como nombre
        client.name = client.last_name
        delete client.last_name
      }

      // Asegurar que hay prefijo por defecto
      if (!client.phone_prefix && client.phone) {
        client.phone_prefix = "+34" // Por defecto España
      }

      // Validar campos obligatorios
      if (!client.name) {
        invalidRows.push(`Fila ${rowNumber}: Falta el campo obligatorio nombre`)
        continue
      }

      if (!client.phone || client.phone.trim() === "") {
        invalidRows.push(`Fila ${rowNumber}: Registro omitido - no tiene teléfono válido`)
        continue
      }

      if (client.tax_id && !isValidTaxId(client.tax_id)) {
        invalidRows.push(`Fila ${rowNumber}: La identificación fiscal "${client.tax_id}" no tiene un formato válido`)
        continue
      }

      const fullPhoneForValidation = `${client.phone_prefix}${client.phone}`
      if (!isValidPhone(fullPhoneForValidation)) {
        invalidRows.push(`Fila ${rowNumber}: El teléfono "${fullPhoneForValidation}" no tiene un formato válido`)
        continue
      }

      // Detectar duplicados por teléfono completo usando normalización
      const normalizedFullPhone = normalizePhoneForDuplicateCheck(client.phone, client.phone_prefix)
      if (phoneTracker.has(normalizedFullPhone)) {
        invalidRows.push(`Fila ${rowNumber}: El teléfono "${normalizedFullPhone}" está duplicado en el archivo`)
        duplicateCount++
        continue
      }
      phoneTracker.add(normalizedFullPhone)


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

    // Lookup de códigos postales a ciudades usando IA
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
          const postalCodePrompt = `Eres un experto en códigos postales españoles e internacionales. Analiza estos códigos postales y devuelve la ciudad correspondiente para cada uno:

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

IMPORTANTE: Solo incluye códigos postales que reconozcas con alta certeza.`

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
              const jsonLine = lines.find((line: string) => line.trim().startsWith("{"))
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

    // Generar CSV de errores si hay errores
    let errorCSV = null
    if (invalidRows.length > 0) {
      errorCSV = generateErrorCSV(invalidRows, headers, dataRows)
    }

    return NextResponse.json({
      mapping,
      data: processedData,
      invalidCount: invalidRows.length,
      totalRows: dataRows.length,
      headers,
      errors: invalidRows,
      duplicateCount,
      errorCSV, // CSV de errores
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: `Error al procesar el archivo: ${error instanceof Error ? error.message : "Error desconocido"}`,
      },
      { status: 500 },
    )
  }
}