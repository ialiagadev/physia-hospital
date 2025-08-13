import { type NextRequest, NextResponse } from "next/server"
import { streamText } from "ai"
import { openai } from "@ai-sdk/openai"

const PHYSIA_KNOWLEDGE = `
# Physia - Sistema Médico Integral

## Descripción General
Physia es un sistema médico integral diseñado para clínicas, consultorios y centros de salud. Ofrece una solución completa para la gestión de pacientes, citas, facturación, comunicación multicanal y mucho más.

## Módulos Principales

### 1. Calendario y Citas
- **Ubicación**: /dashboard (página principal)
- **Funcionalidades**:
  - Gestión completa de citas médicas
  - Vista por día, semana, mes y agenda
  - Vista por profesionales
  - Programación de citas recurrentes
  - Control de conflictos de horarios
  - Integración con videollamadas (Jitsi)
  - Gestión de lista de espera
  - Actividades grupales

### 2. Gestión de Pacientes
- **Ubicación**: /dashboard/clients
- **Funcionalidades**:
  - Registro completo de pacientes
  - Historial médico detallado
  - Seguimientos y evolución
  - Consentimientos informados
  - Tarjetas de fidelidad
  - Importación masiva de datos
  - Comunicación directa con pacientes

### 3. Chat Multicanal
- **Ubicación**: /dashboard/chat
- **Funcionalidades**:
  - Integración con WhatsApp Business
  - Soporte para Telegram
  - Chat web integrado
  - Gestión unificada de conversaciones
  - Respuestas automáticas
  - Historial de conversaciones
  - Notas internas por conversación

### 4. Physia AI
- **Ubicación**: /dashboard/physia-ai
- **Funcionalidades**:
  - Asistente inteligente para diagnósticos
  - Generación automática de informes
  - Análisis de síntomas
  - Sugerencias de tratamiento
  - Procesamiento de lenguaje natural
  - Integración con historial médico

### 5. Sistema de Facturación
- **Ubicación**: /dashboard/facturacion
- **Submódulos**:
  - **Dashboard**: Resumen financiero y estadísticas
  - **Facturas**: Gestión completa de facturación
  - **Gastos**: Control de gastos y proveedores
  - **Estadísticas**: Análisis financiero detallado
  - **Pagos Online**: Enlaces de pago con Stripe
  - **Reportes**: Informes financieros avanzados

### 6. Control Horario (Fichaje)
- **Ubicación**: /dashboard/time-tracking
- **Funcionalidades**:
  - Registro de entrada y salida
  - Control de horas trabajadas
  - Gestión de vacaciones
  - Solicitudes de cambios
  - Reportes de asistencia
  - Integración con nóminas

### 7. Gestión de Stock
- **Ubicación**: /dashboard/stock
- **Funcionalidades**:
  - Inventario de productos y medicamentos
  - Control de stock mínimo
  - Gestión de proveedores
  - Movimientos de entrada y salida
  - Alertas de stock bajo
  - Valoración de inventario

### 8. Profesionales
- **Ubicación**: /dashboard/professionals
- **Funcionalidades**:
  - Registro de profesionales sanitarios
  - Especialidades y competencias
  - Horarios de trabajo
  - Asignación de pacientes
  - Configuración de servicios
  - Estadísticas por profesional

### 9. Servicios
- **Ubicación**: /dashboard/services
- **Funcionalidades**:
  - Catálogo de servicios médicos
  - Precios y tarifas
  - Duración de consultas
  - Asignación a profesionales
  - Categorización de servicios
  - Servicios grupales

### 10. Gestión de Tareas
- **Ubicación**: /dashboard/tareas
- **Funcionalidades**:
  - Creación y asignación de tareas
  - Seguimiento de progreso
  - Prioridades y fechas límite
  - Comentarios y adjuntos
  - Plantillas de tareas
  - Notificaciones automáticas

### 11. Tarjetas de Fidelidad
- **Ubicación**: /dashboard/loyalty-cards
- **Funcionalidades**:
  - Programa de puntos
  - Descuentos y promociones
  - Tarjetas personalizadas
  - Historial de canjes
  - Estadísticas de fidelización
  - Integración con facturación

### 12. Consentimientos Informados
- **Ubicación**: /dashboard/consent-forms
- **Funcionalidades**:
  - Plantillas de consentimientos
  - Firma digital
  - Gestión legal
  - Archivo digital
  - Validación por token
  - Integración con historiales

### 13. Plantillas
- **Ubicación**: /dashboard/templates
- **Funcionalidades**:
  - Plantillas de documentos
  - Informes médicos
  - Recetas digitales
  - Certificados
  - Personalización por centro
  - Biblioteca de plantillas

### 14. Canales de Comunicación
- **Ubicación**: /dashboard/canales
- **Funcionalidades**:
  - Configuración de canales
  - WhatsApp Business API
  - Telegram Bot
  - Email marketing
  - SMS masivos
  - Automatizaciones

### 15. Agentes IA (Beta)
- **Ubicación**: /dashboard/agents
- **Funcionalidades**:
  - Agentes inteligentes especializados
  - Automatización de procesos
  - Respuestas contextuales
  - Aprendizaje continuo
  - Integración con todos los módulos
  - Configuración personalizada

## Configuración del Sistema

### Mi Negocio
- **Ubicación**: /dashboard/organizations
- **Funcionalidades**:
  - Datos de la organización
  - Configuración fiscal
  - Logo personalizado (aparece en sidebar)
  - Gestión de centros
  - Configuración de facturación
  - Datos de contacto

### Configuración Personal
- **Ubicación**: /dashboard/profile
- **Funcionalidades**:
  - Perfil de usuario
  - Preferencias personales
  - Configuración de notificaciones
  - Cambio de contraseña
  - Configuración de idioma
  - Tema de la aplicación

## Características Técnicas

### Seguridad
- Autenticación con Supabase
- Encriptación de datos
- Control de acceso por roles
- Auditoría de acciones
- Backup automático
- Cumplimiento RGPD

### Integraciones
- WhatsApp Business API
- Stripe para pagos
- OpenAI para IA
- Jitsi para videollamadas
- Supabase como backend
- Vercel para hosting

### Accesibilidad
- Diseño responsive
- Soporte para dispositivos móviles
- Navegación por teclado
- Contraste optimizado
- Textos alternativos
- Compatibilidad con lectores de pantalla

## Flujos de Trabajo Comunes

### Crear una Cita
1. Ir a /dashboard (Calendario)
2. Hacer clic en el horario deseado
3. Seleccionar paciente y profesional
4. Elegir servicio y duración
5. Confirmar la cita

### Facturar una Consulta
1. Ir a /dashboard/facturacion
2. Crear nueva factura
3. Seleccionar paciente
4. Añadir servicios realizados
5. Generar y enviar factura

### Gestionar Pacientes
1. Ir a /dashboard/clients
2. Buscar o crear paciente
3. Actualizar historial médico
4. Programar seguimientos
5. Generar informes

### Configurar Chat
1. Ir a /dashboard/canales
2. Configurar WhatsApp Business
3. Conectar número de teléfono
4. Configurar respuestas automáticas
5. Gestionar conversaciones en /dashboard/chat

## Soporte y Ayuda
- Chatbot integrado con conocimiento completo
- Documentación contextual
- Soporte técnico 24/7
- Tutoriales en video
- Base de conocimientos
- Comunidad de usuarios
`

export async function POST(req: NextRequest) {
  try {
    const { messages, model = "gpt-4o", context } = await req.json()

    const systemPrompt = `Eres Physia AI, un asistente médico inteligente especializado en la gestión de centros médicos.

CONTEXTO DEL SISTEMA:
${context ? JSON.stringify(context, null, 2) : "No hay contexto específico disponible"}

CAPACIDADES PRINCIPALES:
1. Gestión de Pacientes
   - Crear, buscar y actualizar información de pacientes
   - Gestionar historiales médicos
   - Programar y modificar citas

2. Facturación y Administración
   - Generar facturas y recibos
   - Gestionar pagos y seguros
   - Reportes financieros

3. Análisis de Datos Médicos
   - Interpretar resultados de laboratorio
   - Análisis de imágenes médicas básicas
   - Estadísticas de salud poblacional

4. Procedimientos Administrativos
   - Gestión de inventario médico
   - Programación de personal
   - Cumplimiento normativo

DIRECTRICES DE RESPUESTA:
- Sé preciso y profesional
- Prioriza siempre la seguridad del paciente
- Si no tienes información específica, indícalo claramente
- Sugiere pasos concretos y accionables
- Mantén la confidencialidad médica

LIMITACIONES:
- No proporciones diagnósticos médicos definitivos
- No reemplaces la consulta médica profesional
- Siempre recomienda consultar con profesionales de la salud para decisiones críticas`

    const result = await streamText({
      model: openai(model),
      messages,
      system: systemPrompt,
      temperature: 0.4,
      maxTokens: 3000,
    })

    return result.toDataStreamResponse()
  } catch (error) {
    console.error("Error in chatbot assistant API:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
