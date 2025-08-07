import { parsePhoneNumber, isValidPhoneNumber, AsYouType, getCountryCallingCode } from 'libphonenumber-js'
import type { CountryCode, NumberFormat } from 'libphonenumber-js'

// ✅ Función simplificada usando libphonenumber-js con tipos correctos
export function extractPhoneAndPrefix(
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
    // ✅ Intentar parsear con país por defecto
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
        formatted: phoneNumber.format('INTERNATIONAL') // ✅ Tipo correcto
      }
    }
  } catch (error) {
    // Si falla completamente, intentar parsing manual básico
    console.warn(`Error parsing phone ${phone}:`, error)
  }
  
  // Fallback manual para casos muy edge
  const cleanPhone = phone.replace(/[\s\-()]/g, "").trim()
  
  // Detectar prefijo manualmente como fallback
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
  
  // Por defecto España
  return { 
    phone: cleanPhone, 
    prefix: "+34", 
    isValid: false,
    country: 'ES'
  }
}

// ✅ Validación simplificada
export function isValidPhone(phone: string, country?: CountryCode): boolean {
  try {
    if (country) {
      return isValidPhoneNumber(phone, country)
    }
    return isValidPhoneNumber(phone)
  } catch {
    return false
  }
}

// ✅ Formateo de teléfono con tipos correctos
export function formatPhone(
  phone: string, 
  format: NumberFormat = 'E.164', // ✅ Tipo correcto con punto
  country?: CountryCode
): string {
  try {
    const phoneNumber = country ? parsePhoneNumber(phone, country) : parsePhoneNumber(phone)
    if (phoneNumber) {
      return phoneNumber.format(format)
    }
    return phone
  } catch {
    return phone
  }
}

// ✅ Normalización para detectar duplicados (siempre E.164)
export function normalizePhoneForDuplicateCheck(phone: string, prefix: string): string {
  try {
    const fullPhone = prefix.startsWith('+') ? `${prefix}${phone}` : `+${prefix}${phone}`
    const phoneNumber = parsePhoneNumber(fullPhone)
    if (phoneNumber) {
      return phoneNumber.format('E.164') // ✅ Formato estándar internacional con punto
    }
  } catch {
    // Fallback manual
  }
  
  // Fallback: limpiar y concatenar
  const cleanPhone = phone.replace(/[\s\-()]/g, "").trim()
  const cleanPrefix = prefix.startsWith('+') ? prefix : `+${prefix}`
  return `${cleanPrefix}${cleanPhone}`
}

// ✅ Obtener información del país
export function getPhoneCountryInfo(phone: string): { 
  country?: CountryCode; 
  countryName?: string; 
  prefix?: string;
  isValid?: boolean;
} {
  try {
    const phoneNumber = parsePhoneNumber(phone)
    if (phoneNumber) {
      return {
        country: phoneNumber.country,
        countryName: getCountryName(phoneNumber.country),
        prefix: `+${phoneNumber.countryCallingCode}`,
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
  }
  
  return countryCode ? countryNames[countryCode] || countryCode : 'Desconocido'
}

// ✅ Formateo mientras escribes (útil para UIs)
export function formatAsYouType(phone: string, country?: CountryCode): string {
  try {
    const formatter = new AsYouType(country)
    return formatter.input(phone)
  } catch {
    return phone
  }
}

// ✅ Función helper para obtener todos los formatos disponibles
export function getAllPhoneFormats(phone: string, country?: CountryCode): {
  national?: string;
  international?: string;
  e164?: string;
  uri?: string;
} {
  try {
    const phoneNumber = country ? parsePhoneNumber(phone, country) : parsePhoneNumber(phone)
    if (phoneNumber) {
      return {
        national: phoneNumber.format('NATIONAL'),
        international: phoneNumber.format('INTERNATIONAL'),
        e164: phoneNumber.format('E.164'), // ✅ Con punto
        uri: phoneNumber.format('RFC3966')
      }
    }
  } catch {
    // Silenciar errores
  }
  
  return {}
}
