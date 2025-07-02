/**
 * Normaliza un número de teléfono eliminando espacios, guiones, paréntesis
 * y manejando prefijos internacionales de forma consistente
 */
export function normalizePhoneNumber(phone: string): string {
    if (!phone) return ""
  
    // Eliminar todos los caracteres no numéricos excepto el +
    let normalized = phone.replace(/[^\d+]/g, "")
  
    // Si empieza con +34, convertir a formato nacional
    if (normalized.startsWith("+34")) {
      normalized = normalized.substring(3)
    }
    // Si empieza con 0034, convertir a formato nacional
    else if (normalized.startsWith("0034")) {
      normalized = normalized.substring(4)
    }
    // Si empieza con 34 y tiene más de 11 dígitos, probablemente es +34
    else if (normalized.startsWith("34") && normalized.length > 11) {
      normalized = normalized.substring(2)
    }
  
    // Eliminar ceros iniciales
    normalized = normalized.replace(/^0+/, "")
  
    return normalized
  }
  
  /**
   * Compara dos números de teléfono normalizándolos primero
   */
  export function arePhoneNumbersEqual(phone1: string, phone2: string): boolean {
    const normalized1 = normalizePhoneNumber(phone1)
    const normalized2 = normalizePhoneNumber(phone2)
  
    return normalized1 === normalized2 && normalized1.length >= 9
  }
  
  /**
   * Formatea un número de teléfono para mostrar
   */
  export function formatPhoneNumber(phone: string): string {
    const normalized = normalizePhoneNumber(phone)
  
    if (normalized.length === 9) {
      // Formato español: 612 345 678
      return normalized.replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3")
    }
  
    return phone // Devolver original si no es formato español estándar
  }
  
  /**
   * Valida si un número de teléfono tiene formato válido
   */
  export function isValidPhoneNumber(phone: string): boolean {
    const normalized = normalizePhoneNumber(phone)
  
    // Debe tener al menos 9 dígitos y máximo 15 (estándar internacional)
    return normalized.length >= 9 && normalized.length <= 15 && /^\d+$/.test(normalized)
  }
  
  /**
   * Genera variaciones de un número de teléfono para búsqueda
   */
  export function getPhoneSearchVariations(phone: string): string[] {
    const normalized = normalizePhoneNumber(phone)
  
    if (normalized.length === 9) {
      return [
        normalized, // 612345678
        `+34${normalized}`, // +34612345678
        `0034${normalized}`, // 0034612345678
        `34${normalized}`, // 34612345678
      ]
    }
  
    return [normalized]
  }
  