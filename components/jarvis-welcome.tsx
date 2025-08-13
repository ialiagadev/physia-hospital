"use client"
import { Card, CardContent } from "@/components/ui/card"
import {
  Brain,
  Users,
  Calendar,
  FileText,
  DollarSign,
  Stethoscope,
  ClipboardList,
  TrendingUp,
  MessageSquare,
  Sparkles,
} from "lucide-react"

interface JarvisWelcomeProps {
  onQuickStart: (message: string) => void
}

const quickStartOptions = [
  {
    icon: Users,
    title: "Gestión de Pacientes",
    description: "Crear, buscar y gestionar historiales",
    message: "¿Cómo puedo gestionar mejor los historiales de mis pacientes en Physia?",
    color: "text-blue-600 bg-blue-50 border-blue-200",
  },
  {
    icon: Calendar,
    title: "Agenda Médica",
    description: "Optimizar citas y horarios",
    message: "Ayúdame a optimizar la gestión de citas y agenda médica en Physia",
    color: "text-green-600 bg-green-50 border-green-200",
  },
  {
    icon: DollarSign,
    title: "Facturación",
    description: "Gestionar cobros y pagos",
    message: "¿Cómo funciona el sistema de facturación y cobros en Physia?",
    color: "text-yellow-600 bg-yellow-50 border-yellow-200",
  },
  {
    icon: FileText,
    title: "Documentación Clínica",
    description: "Crear informes y recetas",
    message: "Ayúdame a redactar un informe médico profesional",
    color: "text-purple-600 bg-purple-50 border-purple-200",
  },
  {
    icon: Stethoscope,
    title: "Consultas Médicas",
    description: "Diagnósticos y tratamientos",
    message: "Necesito ayuda con diagnósticos diferenciales y protocolos de tratamiento",
    color: "text-red-600 bg-red-50 border-red-200",
  },
  {
    icon: ClipboardList,
    title: "Inventario Médico",
    description: "Control de stock y medicamentos",
    message: "¿Cómo gestiono el inventario de medicamentos y material médico en Physia?",
    color: "text-indigo-600 bg-indigo-50 border-indigo-200",
  },
  {
    icon: TrendingUp,
    title: "Reportes y Estadísticas",
    description: "Análisis de rendimiento",
    message: "Quiero generar reportes de rendimiento y estadísticas de mi clínica",
    color: "text-orange-600 bg-orange-50 border-orange-200",
  },
  {
    icon: MessageSquare,
    title: "Comunicación",
    description: "Gestión de mensajes y seguimientos",
    message: "¿Cómo puedo mejorar la comunicación con mis pacientes usando Physia?",
    color: "text-teal-600 bg-teal-50 border-teal-200",
  },
]

export function JarvisWelcome({ onQuickStart }: JarvisWelcomeProps) {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="relative inline-block mb-4">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
            <Brain className="h-10 w-10 text-white" />
          </div>
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
            <Sparkles className="h-3 w-3 text-white" />
          </div>
        </div>

        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent mb-2">
          ¡Hola! Soy PHYSIA AI
        </h1>
        <p className="text-lg text-gray-600 mb-4">Tu asistente inteligente para la gestión clínica y administrativa</p>
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-50 border border-purple-200 rounded-full text-sm text-purple-700">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          Conectado y listo para ayudarte
        </div>
      </div>

      {/* Quick Start Options */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 text-center">¿En qué puedo ayudarte hoy?</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickStartOptions.map((option, index) => (
            <Card
              key={index}
              className={`cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-105 border-2 ${option.color}`}
              onClick={() => onQuickStart(option.message)}
            >
              <CardContent className="p-4 text-center">
                <option.icon className={`h-8 w-8 mx-auto mb-3 ${option.color.split(" ")[0]}`} />
                <h3 className="font-semibold text-sm mb-1">{option.title}</h3>
                <p className="text-xs text-gray-600">{option.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-sm text-amber-800 text-center">
          <strong>Importante:</strong> PHYSIA AI es una herramienta de apoyo. Siempre consulta con profesionales
          sanitarios para decisiones clínicas importantes.
        </p>
      </div>
    </div>
  )
}
