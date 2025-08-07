import * as XLSX from "xlsx"
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js'
import type { CountryCode } from 'libphonenumber-js'

// ✅ Interfaz actualizada con todos los campos de teléfono
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
  phone_prefix?: string // ✅ Prefijo telefónico (+34, +1, etc.)
  phone_country?: string // ✅ Código del país (ES, US, FR, etc.)
  phone_formatted?: string // ✅ Teléfono en formato internacional
  phone_is_valid?: boolean // ✅ Si el teléfono es válido según libphonenumber-js
  client_type?: "private" | "public"
  birth_date?: string
  gender?: "male" | "female" | "other"
}

export interface ParseResult {
  data: ClientImportData[]
  errors: string[]
  totalRows: number
}

// ✅ Función mejorada para extraer teléfono y prefijo usando libphonenumber-js
function extractPhoneAndPrefix(
  phone: string, 
  defaultCountry: CountryCode = 'ES'
): { 
  phone: string; 
  prefix: string; 
  isValid: boolean; 
  country?: CountryCode;
  formatted?: string;
} {
  if (!phone) return { phone: "", prefix: "+34", isValid: false }
  
  try {
    // Intentar parsear con país por defecto
    let phoneNumber = parsePhoneNumber(phone, defaultCountry)
    
    // Si no funciona, intentar sin país por defecto
    if (!phoneNumber) {
      phoneNumber = parsePhoneNumber(phone)
    }
    
    if (phoneNumber) {
      return {
        phone: phoneNumber.nationalNumber,
        prefix: `+${phoneNumber.countryCallingCode}`,
        isValid: phoneNumber.isValid(),
        country: phoneNumber.country,
        formatted: phoneNumber.format('INTERNATIONAL')
      }
    }
  } catch (error) {
    console.warn(`Error parsing phone ${phone}:`, error)
  }
  
  // Fallback manual para casos edge
  const cleanPhone = phone.replace(/[\s\-()]/g, "").trim()
  
  // Detectar prefijos comunes manualmente
  if (cleanPhone.startsWith('+34')) {
    return {
      phone: cleanPhone.substring(3),
      prefix: '+34',
      isValid: false,
      country: 'ES'
    }
  }
  
  if (cleanPhone.startsWith('+1')) {
    return {
      phone: cleanPhone.substring(2),
      prefix: '+1',
      isValid: false,
      country: 'US'
    }
  }
  
  if (cleanPhone.startsWith('+33')) {
    return {
      phone: cleanPhone.substring(3),
      prefix: '+33',
      isValid: false,
      country: 'FR'
    }
  }
  
  if (cleanPhone.startsWith('+44')) {
    return {
      phone: cleanPhone.substring(3),
      prefix: '+44',
      isValid: false,
      country: 'GB'
    }
  }
  
  if (cleanPhone.startsWith('+49')) {
    return {
      phone: cleanPhone.substring(3),
      prefix: '+49',
      isValid: false,
      country: 'DE'
    }
  }
  
  // Detectar por formato sin prefijo
  if (cleanPhone.length === 9 && /^[6-9]/.test(cleanPhone)) {
    // Número español típico
    return {
      phone: cleanPhone,
      prefix: '+34',
      isValid: false,
      country: 'ES'
    }
  }
  
  if (cleanPhone.length === 10 && /^[2-9]/.test(cleanPhone)) {
    // Número estadounidense típico
    return {
      phone: cleanPhone,
      prefix: '+1',
      isValid: false,
      country: 'US'
    }
  }
  
  // Por defecto España
  return { 
    phone: cleanPhone, 
    prefix: "+34", 
    isValid: false,
    country: 'ES'
  }
}

// Función para normalizar NIF/CIF
function normalizeTaxId(taxId: string): string {
  return taxId.replace(/[-\s]/g, "").toUpperCase().trim()
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

// ✅ Función principal de parsing actualizada
export async function parseFile(file: File): Promise<ParseResult> {
  const errors: string[] = []
  const data: ClientImportData[] = []

  try {
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { 
      type: "buffer",
      codepage: 65001, // UTF-8
      cellText: false,
      cellDates: true,
    })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]

    // Convertir a JSON con headers
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1,
      defval: "",
      blankrows: false,
    }) as string[][]

    if (jsonData.length === 0) {
      errors.push("El archivo está vacío")
      return { data, errors, totalRows: 0 }
    }

    const headers = jsonData[0].map((header) => cleanText(header?.toString() || ""))
    const dataRows = jsonData.slice(1).filter((row) => row.some((cell) => cell && cell.toString().trim() !== ""))

    if (dataRows.length === 0) {
      errors.push("No se encontraron datos válidos en el archivo")
      return { data, errors, totalRows: 0 }
    }

    // ✅ Mapeo actualizado de columnas (case insensitive) - incluye todos los campos de teléfono
    const columnMapping: Record<string, keyof ClientImportData> = {
      // Nombre
      "nombre": "name",
      "name": "name",
      "nombre o razón social": "name",
      "razón social": "name",
      "razon social": "name",
      "empresa": "name",
      "client name": "name",
      "customer name": "name",
      
      // Tax ID
      "cif/nif": "tax_id",
      "cif": "tax_id",
      "nif": "tax_id",
      "dni": "tax_id",
      "tax id": "tax_id",
      "tax_id": "tax_id",
      "vat number": "tax_id",
      "identificación fiscal": "tax_id",
      "identificacion fiscal": "tax_id",
      "documento": "tax_id",
      
      // Dirección
      "direccion": "address",
      "dirección": "address",
      "address": "address",
      "domicilio": "address",
      "calle": "address",
      
      // Código postal
      "codigo postal": "postal_code",
      "código postal": "postal_code",
      "cp": "postal_code",
      "postal code": "postal_code",
      "zip": "postal_code",
      "zip code": "postal_code",
      
      // Ciudad
      "ciudad": "city",
      "city": "city",
      "localidad": "city",
      "municipio": "city",
      "town": "city",
      
      // Provincia
      "provincia": "province",
      "province": "province",
      "estado": "province",
      "state": "province",
      "region": "province",
      "región": "province",
      
      // País
      "pais": "country",
      "país": "country",
      "country": "country",
      "nacionalidad": "country",
      
      // Email
      "email": "email",
      "e-mail": "email",
      "correo": "email",
      "correo electrónico": "email",
      "correo electronico": "email",
      "mail": "email",
      
      // Teléfono
      "telefono": "phone",
      "teléfono": "phone",
      "phone": "phone",
      "movil": "phone",
      "móvil": "phone",
      "celular": "phone",
      "contacto": "phone",
      "phone number": "phone",
      "telephone": "phone",
      
      // ✅ Prefijo telefónico
      "prefijo telefónico": "phone_prefix",
      "prefijo teléfono": "phone_prefix",
      "prefijo": "phone_prefix",
      "código país": "phone_prefix",
      "codigo pais": "phone_prefix",
      "phone prefix": "phone_prefix",
      "country code": "phone_prefix",
      "calling code": "phone_prefix",
      
      // Tipo de cliente
      "tipo cliente": "client_type",
      "tipo de cliente": "client_type",
      "client type": "client_type",
      "customer type": "client_type",
      "sector": "client_type",
      
      // Fecha de nacimiento
      "fecha de nacimiento": "birth_date",
      "fecha nacimiento": "birth_date",
      "nacimiento": "birth_date",
      "birth date": "birth_date",
      "date of birth": "birth_date",
      "birthday": "birth_date",
      "cumpleaños": "birth_date",
      
      // Género
      "genero": "gender",
      "género": "gender",
      "sexo": "gender",
      "gender": "gender",
      "sex": "gender",
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

    // ✅ Procesar cada fila con manejo completo de teléfonos
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
          let processedValue = cleanText(value.toString().trim())

          // Procesar campos específicos
          if (field === "tax_id") {
            processedValue = normalizeTaxId(processedValue)
          } else if (field === "phone") {
            // ✅ Usar libphonenumber-js para extraer toda la información del teléfono
            const phoneResult = extractPhoneAndPrefix(processedValue, 'ES')
            
            client.phone = phoneResult.phone
            client.phone_prefix = phoneResult.prefix
            client.phone_country = phoneResult.country
            client.phone_is_valid = phoneResult.isValid
            client.phone_formatted = phoneResult.formatted
            
            // Solo asignar prefijo si no se mapeó específicamente
            if (!fieldIndexes.phone_prefix) {
              client.phone_prefix = phoneResult.prefix
            }
            return // Salir temprano para evitar sobrescribir
          } else if (field === "phone_prefix") {
            // Normalizar prefijo manualmente
            if (!processedValue.startsWith("+")) {
              processedValue = "+" + processedValue.replace(/[^\d]/g, "")
            }
          } else if (field === "postal_code") {
            processedValue = normalizePostalCode(processedValue)
          } else if (field === "client_type") {
            const lowerValue = processedValue.toLowerCase()
            processedValue =
              lowerValue.includes("público") ||
              lowerValue.includes("public") ||
              lowerValue.includes("ayuntamiento") ||
              lowerValue.includes("gobierno") ||
              lowerValue.includes("administracion") ||
              lowerValue.includes("administración") ||
              lowerValue.includes("estatal") ||
              lowerValue.includes("municipal")
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

      // ✅ Asegurar que hay prefijo por defecto si hay teléfono
      if (client.phone && !client.phone_prefix) {
        client.phone_prefix = "+34" // Por defecto España
        client.phone_country = "ES"
      }

      // Validar campos obligatorios
      if (!client.name) {
        errors.push(`Fila ${rowNumber}: Falta el nombre del cliente`)
        return
      }

      if (!client.tax_id) {
        errors.push(`Fila ${rowNumber}: Falta el CIF/NIF`)
        return
      }

      // ✅ Teléfono obligatorio
      if (!client.phone) {
        errors.push(`Fila ${rowNumber}: El teléfono es obligatorio`)
        return
      }

      // ✅ Validar formato de teléfono si tenemos libphonenumber-js
      if (client.phone && client.phone_prefix) {
        try {
          const fullPhone = `${client.phone_prefix}${client.phone}`
          const isValid = isValidPhoneNumber(fullPhone)
          
          if (!isValid) {
            errors.push(`Fila ${rowNumber}: El teléfono "${fullPhone}" no tiene un formato válido`)
            return
          }
          
          // Actualizar el estado de validez
          client.phone_is_valid = isValid
        } catch (error) {
          errors.push(`Fila ${rowNumber}: Error al validar el teléfono "${client.phone_prefix}${client.phone}"`)
          return
        }
      }

      // Aplicar valores por defecto
      client.country = client.country || "España"
      client.client_type = client.client_type || "private"

      // Limpiar campos opcionales
      Object.keys(client).forEach((key) => {
        if (client[key as keyof ClientImportData] === "" || 
            client[key as keyof ClientImportData] === null || 
            client[key as keyof ClientImportData] === undefined) {
          ;(client as any)[key] = null
        }
      })

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

// ✅ Función helper para validar teléfono
export function validatePhone(phone: string, prefix?: string): boolean {
  try {
    const fullPhone = prefix ? `${prefix}${phone}` : phone
    return isValidPhoneNumber(fullPhone)
  } catch {
    return false
  }
}

// ✅ Función helper para formatear teléfono
export function formatPhone(phone: string, prefix?: string, format: 'NATIONAL' | 'INTERNATIONAL' | 'E.164' = 'INTERNATIONAL'): string {
  try {
    const fullPhone = prefix ? `${prefix}${phone}` : phone
    const phoneNumber = parsePhoneNumber(fullPhone)
    if (phoneNumber) {
      return phoneNumber.format(format)
    }
    return phone
  } catch {
    return phone
  }
}

// ✅ Función helper para obtener información del país
export function getPhoneCountryInfo(phone: string, prefix?: string): { 
  country?: CountryCode; 
  countryName?: string; 
  isValid?: boolean;
} {
  try {
    const fullPhone = prefix ? `${prefix}${phone}` : phone
    const phoneNumber = parsePhoneNumber(fullPhone)
    if (phoneNumber) {
      return {
        country: phoneNumber.country,
        countryName: getCountryName(phoneNumber.country),
        isValid: phoneNumber.isValid()
      }
    }
  } catch {
    // Silenciar errores
  }
  
  return {}
}

// ✅ Helper para obtener nombre del país
function getCountryName(countryCode?: CountryCode): string {
  const countryNames: Record<string, string> = {
    'ES': 'España',
    'FR': 'Francia', 
    'US': 'Estados Unidos',
    'GB': 'Reino Unido',
    'DE': 'Alemania',
    'IT': 'Italia',
    'PT': 'Portugal',
    'NL': 'Países Bajos',
    'BE': 'Bélgica',
    'CH': 'Suiza',
    'AT': 'Austria',
    'MX': 'México',
    'AR': 'Argentina',
    'BR': 'Brasil',
    'CO': 'Colombia',
    'CL': 'Chile',
    'PE': 'Perú',
    'VE': 'Venezuela',
    'CA': 'Canadá',
    'AU': 'Australia',
    'JP': 'Japón',
    'KR': 'Corea del Sur',
    'CN': 'China',
    'IN': 'India',
    'RU': 'Rusia',
  }
  
  return countryCode ? countryNames[countryCode] || countryCode : 'Desconocido'
}
