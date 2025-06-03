// Función FINAL para asegurar que el tipo de factura es válido
export function validateInvoiceType(type: string): "normal" | "rectificativa" | "simplificada" {
    console.log(`🔍 [validateInvoiceType] Input: "${type}" (${typeof type})`)
  
    // Limpiar el valor de entrada
    const cleaned = String(type).toLowerCase().trim()
    console.log(`🔍 [validateInvoiceType] Cleaned: "${cleaned}"`)
  
    // Mapeo directo - ESTA ES LA FUENTE DE LA VERDAD
    switch (cleaned) {
      case "normal":
        console.log(`✅ [validateInvoiceType] Output: "normal"`)
        return "normal"
      case "rectificativa":
      case "rectificative":
        console.log(`✅ [validateInvoiceType] Output: "rectificativa"`)
        return "rectificativa"
      case "simplificada":
      case "simplified":
      case "simple":
        console.log(`✅ [validateInvoiceType] Mapping "${type}" -> "simplificada"`)
        return "simplificada"
      default:
        console.warn(`⚠️ [validateInvoiceType] Unknown type: "${type}", defaulting to "normal"`)
        return "normal"
    }
  }
  
  // Tipos válidos para TypeScript
  export type InvoiceType = "normal" | "rectificativa" | "simplificada"
  
  // Función DEFINITIVA que garantiza un valor válido
  export function ensureValidInvoiceType(type: any): "normal" | "rectificativa" | "simplificada" {
    console.log(`🛡️ [ensureValidInvoiceType] Input:`, { value: type, type: typeof type })
  
    // Si no es string, convertir
    if (typeof type !== "string") {
      console.error(`❌ [ensureValidInvoiceType] Type is not string: ${typeof type}`, type)
      return "normal"
    }
  
    // Usar validateInvoiceType para la lógica
    const validated = validateInvoiceType(type)
    console.log(`🛡️ [ensureValidInvoiceType] Validated result: "${validated}"`)
  
    // Verificación final de seguridad
    const validValues: Array<"normal" | "rectificativa" | "simplificada"> = ["normal", "rectificativa", "simplificada"]
  
    if (!validValues.includes(validated)) {
      console.error(`❌ [ensureValidInvoiceType] Invalid validated type: "${validated}", forcing to "normal"`)
      return "normal"
    }
  
    console.log(`✅ [ensureValidInvoiceType] Final result: "${validated}"`)
    return validated
  }
  
  // Función adicional para casos específicos donde necesitamos forzar el mapeo
  export function forceValidInvoiceType(frontendValue: string): "normal" | "rectificativa" | "simplificada" {
    console.log(`🔧 [forceValidInvoiceType] Forcing conversion of: "${frontendValue}"`)
  
    // Mapeo explícito y forzado
    if (frontendValue === "simplificada" || frontendValue === "simplified") {
      console.log(`🔧 [forceValidInvoiceType] Forced result: "simplificada"`)
      return "simplificada"
    }
  
    if (frontendValue === "rectificativa" || frontendValue === "rectificative") {
      console.log(`🔧 [forceValidInvoiceType] Forced result: "rectificativa"`)
      return "rectificativa"
    }
  
    console.log(`🔧 [forceValidInvoiceType] Forced result: "normal"`)
    return "normal"
  }
  