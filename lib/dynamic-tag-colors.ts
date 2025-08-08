// Función para determinar si un color es claro u oscuro
export function isLightColor(hex: string): boolean {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    
    // Calcular luminancia usando la fórmula estándar
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    return luminance > 0.5
  }
  
  // Función para generar un color más claro (para el fondo)
  export function lightenColor(hex: string, amount: number = 0.9): string {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    
    const newR = Math.round(r + (255 - r) * amount)
    const newG = Math.round(g + (255 - g) * amount)
    const newB = Math.round(b + (255 - b) * amount)
    
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`
  }
  
  // Función para generar un color más oscuro (para el texto)
  export function darkenColor(hex: string, amount: number = 0.3): string {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    
    const newR = Math.round(r * (1 - amount))
    const newG = Math.round(g * (1 - amount))
    const newB = Math.round(b * (1 - amount))
    
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`
  }
  
  // Función para generar estilos dinámicos para cualquier color
  export function generateTagStyle(baseColor: string): {
    backgroundColor: string
    textColor: string
    style: React.CSSProperties
  } {
    const backgroundColor = lightenColor(baseColor, 0.85)
    const textColor = darkenColor(baseColor, 0.2)
    
    return {
      backgroundColor,
      textColor,
      style: {
        backgroundColor,
        color: textColor,
        border: `1px solid ${lightenColor(baseColor, 0.7)}`,
      }
    }
  }
  
  // Mapeo extendido que incluye colores predefinidos y dinámicos
  export const EXTENDED_TAG_COLOR_MAP = {
    // Colores predefinidos (mantener compatibilidad)
    "bg-blue-100 text-blue-800": "#3B82F6",
    "bg-red-100 text-red-800": "#EF4444", 
    "bg-green-100 text-green-800": "#10B981",
    "bg-yellow-100 text-yellow-800": "#F59E0B",
    "bg-purple-100 text-purple-800": "#8B5CF6",
    "bg-indigo-100 text-indigo-800": "#6366F1",
    "bg-orange-100 text-orange-800": "#F97316",
    "bg-cyan-100 text-cyan-800": "#06B6D4",
  } as const
  
  // Función para verificar si un color es predefinido
  export function isPredefinedColor(hex: string): boolean {
    return Object.values(EXTENDED_TAG_COLOR_MAP).includes(hex as any)
  }
  
  // Función para obtener la clase de Tailwind si es predefinida, o generar estilo dinámico
  export function getTagDisplayStyle(hex: string): {
    className?: string
    style?: React.CSSProperties
    isDynamic: boolean
  } {
    // Buscar si es un color predefinido
    const predefinedEntry = Object.entries(EXTENDED_TAG_COLOR_MAP).find(([_, value]) => value === hex)
    
    if (predefinedEntry) {
      return {
        className: predefinedEntry[0],
        isDynamic: false
      }
    }
    
    // Si no es predefinido, generar estilo dinámico
    const dynamicStyle = generateTagStyle(hex)
    return {
      style: dynamicStyle.style,
      isDynamic: true
    }
  }
  
  // Colores predefinidos actualizados para el selector
  export const predefinedTagColors = [
    { name: "Azul", value: "bg-blue-100 text-blue-800", preview: "bg-blue-500", hex: "#3B82F6" },
    { name: "Rojo", value: "bg-red-100 text-red-800", preview: "bg-red-500", hex: "#EF4444" },
    { name: "Verde", value: "bg-green-100 text-green-800", preview: "bg-green-500", hex: "#10B981" },
    { name: "Amarillo", value: "bg-yellow-100 text-yellow-800", preview: "bg-yellow-500", hex: "#F59E0B" },
    { name: "Morado", value: "bg-purple-100 text-purple-800", preview: "bg-purple-500", hex: "#8B5CF6" },
    { name: "Índigo", value: "bg-indigo-100 text-indigo-800", preview: "bg-indigo-500", hex: "#6366F1" },
    { name: "Naranja", value: "bg-orange-100 text-orange-800", preview: "bg-orange-500", hex: "#F97316" },
    { name: "Cian", value: "bg-cyan-100 text-cyan-800", preview: "bg-cyan-500", hex: "#06B6D4" },
  ]
  
  // Función para convertir cualquier color a hex (mantener compatibilidad)
  export function colorToHex(color: string): string {
    // Si ya es un color predefinido de Tailwind, convertir
    if (color.startsWith('bg-')) {
      return EXTENDED_TAG_COLOR_MAP[color as keyof typeof EXTENDED_TAG_COLOR_MAP] || "#8B5CF6"
    }
    
    // Si ya es hex, devolverlo
    if (color.startsWith('#')) {
      return color
    }
    
    // Fallback
    return "#8B5CF6"
  }
  
  // Función para obtener el estilo de visualización desde hex
  export function hexToDisplayStyle(hex: string): {
    className?: string
    style?: React.CSSProperties
    isDynamic: boolean
  } {
    return getTagDisplayStyle(hex)
  }
  