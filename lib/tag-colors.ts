// Mapeo entre clases de Tailwind y colores hexadecimales
export const TAG_COLOR_MAP = {
    // Clases de Tailwind -> Colores hexadecimales
    "bg-blue-100 text-blue-800": "#3B82F6",
    "bg-red-100 text-red-800": "#EF4444", 
    "bg-green-100 text-green-800": "#10B981",
    "bg-yellow-100 text-yellow-800": "#F59E0B",
    "bg-purple-100 text-purple-800": "#8B5CF6",
    "bg-indigo-100 text-indigo-800": "#6366F1",
    "bg-orange-100 text-orange-800": "#F97316",
    "bg-cyan-100 text-cyan-800": "#06B6D4",
  } as const
  
  // Mapeo inverso: Colores hexadecimales -> Clases de Tailwind
  export const HEX_TO_TAILWIND_MAP = {
    "#3B82F6": "bg-blue-100 text-blue-800",
    "#EF4444": "bg-red-100 text-red-800",
    "#10B981": "bg-green-100 text-green-800", 
    "#F59E0B": "bg-yellow-100 text-yellow-800",
    "#8B5CF6": "bg-purple-100 text-purple-800",
    "#6366F1": "bg-indigo-100 text-indigo-800",
    "#F97316": "bg-orange-100 text-orange-800",
    "#06B6D4": "bg-cyan-100 text-cyan-800",
  } as const
  
  // Función para convertir clase de Tailwind a hex
  export function tailwindToHex(tailwindClass: string): string {
    return TAG_COLOR_MAP[tailwindClass as keyof typeof TAG_COLOR_MAP] || "#8B5CF6"
  }
  
  // Función para convertir hex a clase de Tailwind
  export function hexToTailwind(hexColor: string): string {
    return HEX_TO_TAILWIND_MAP[hexColor as keyof typeof HEX_TO_TAILWIND_MAP] || "bg-purple-100 text-purple-800"
  }
  
  // Colores predefinidos para los selectores
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
  