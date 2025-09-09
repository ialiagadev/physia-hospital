export interface AgentField {
    id: string
    label: string
    type: "text" | "textarea" | "select" | "multiselect" | "switch" | "number"
    required?: boolean
    placeholder?: string
    options?: string[]
    description?: string
  }
  
  export interface AgentTemplate {
    id: string
    name: string
    description: string
    icon: string
    color: string
    fields: AgentField[]
    generatePrompt: (data: Record<string, any>) => string
  }
  
  export const agentTemplates: AgentTemplate[] = [
    {
      id: "customer-service",
      name: "Atención al Cliente",
      description: "Asistente especializado en atención al cliente médica",
      icon: "👥",
      color: "bg-blue-500",
      fields: [
        {
          id: "agentName",
          label: "Nombre del agente",
          type: "text",
          required: true,
          placeholder: "Ej: Asistente PHYSIA",
        },
        {
          id: "specialties",
          label: "Especialidades",
          type: "textarea",
          required: true,
          placeholder: "fisioterapia, osteopatía, podología...",
          description: "Especialidades médicas de la clínica",
        },
        {
          id: "communicationTone",
          label: "Tono de comunicación",
          type: "select",
          required: true,
          options: ["Amigable y empático", "Profesional", "Cercano y familiar", "Formal"],
        },
        {
          id: "welcomeMessage",
          label: "Mensaje de presentación",
          type: "textarea",
          required: true,
          placeholder: "¡Hola! Soy PHYSIA... ¿en qué te puedo ayudar?",
        },
        {
          id: "useEmojis",
          label: "Usar emoticonos",
          type: "switch",
        },
        {
          id: "symptomEvaluation",
          label: "Evaluación de síntomas",
          type: "switch",
          description: "Permitir evaluación básica de síntomas",
        },
        {
          id: "appointmentManagement",
          label: "Gestión de citas",
          type: "switch",
          description: "Ayudar con reservas y consultas de citas",
        },
        {
          id: "clinicInfo",
          label: "Información de clínica",
          type: "switch",
          description: "Proporcionar información sobre servicios y horarios",
        },
        {
          id: "emergencyProtocol",
          label: "Protocolo de emergencias",
          type: "switch",
          description: "Detectar y derivar emergencias médicas",
        },
        {
          id: "customInstructions",
          label: "Instrucciones personalizadas",
          type: "textarea",
          placeholder: "Instrucciones adicionales específicas para tu clínica...",
        },
      ],
      generatePrompt: (data) => {
        return `Eres ${data.agentName || "un asistente médico"}, un asistente de IA especializado en atención al cliente para una clínica de salud.
  
  ## Especialidades de la clínica:
  ${data.specialties || "Servicios médicos generales"}
  
  ## Tono de comunicación:
  ${data.communicationTone || "Profesional"} ${data.useEmojis ? "con uso moderado de emoticonos" : "sin emoticonos"}
  
  ## Mensaje de bienvenida:
  "${data.welcomeMessage || "¡Hola! ¿En qué puedo ayudarte hoy?"}"
  
  ## Funcionalidades activas:
  ${data.symptomEvaluation ? "✅ Evaluación básica de síntomas (sin diagnósticos médicos)" : "❌ No evaluar síntomas"}
  ${data.appointmentManagement ? "✅ Gestión y consultas de citas" : "❌ No gestionar citas"}
  ${data.clinicInfo ? "✅ Información sobre servicios y horarios" : "❌ No proporcionar información de clínica"}
  ${data.emergencyProtocol ? "✅ Detectar emergencias y derivar al 112" : "❌ No protocolo de emergencias"}
  
  ## Instrucciones importantes:
  - NUNCA proporciones diagnósticos médicos
  - Siempre recomienda consultar con un profesional para síntomas serios
  - Mantén la confidencialidad del paciente
  - Sé empático y comprensivo
  
  ${data.customInstructions ? `## Instrucciones personalizadas:\n${data.customInstructions}` : ""}
  
  Responde siempre de manera útil, profesional y dentro de tus capacidades definidas.`
      },
    },
    {
      id: "debt-management",
      name: "Gestión de Impagos",
      description: "Asistente experto en recordar y gestionar cobros pendientes de forma profesional y empática",
      icon: "💳",
      color: "bg-red-500",
      fields: [
        {
          id: "agentName",
          label: "Nombre del agente",
          type: "text",
          required: true,
          placeholder: "Ej: Asistente de Facturación",
        },
        {
          id: "clinicName",
          label: "Nombre de la clínica",
          type: "text",
          required: true,
          placeholder: "Ej: Clínica PHYSIA",
        },
        {
          id: "communicationTone",
          label: "Tono de comunicación",
          type: "select",
          required: true,
          options: ["Empático y comprensivo", "Profesional y directo", "Amigable pero firme", "Formal"],
        },
        {
          id: "paymentMethods",
          label: "Métodos de pago disponibles",
          type: "multiselect",
          required: true,
          options: [
            "Efectivo",
            "Tarjeta de crédito",
            "Tarjeta de débito",
            "Transferencia bancaria",
            "Bizum",
            "Financiación",
          ],
        },
        {
          id: "gracePeriod",
          label: "Período de gracia (días)",
          type: "number",
          placeholder: "30",
        },
        {
          id: "offerPaymentPlans",
          label: "Ofrecer planes de pago",
          type: "switch",
          description: "Permitir negociar planes de pago fraccionado",
        },
        {
          id: "escalationProtocol",
          label: "Protocolo de escalación",
          type: "switch",
          description: "Derivar casos complejos a administración",
        },
        {
          id: "legalWarnings",
          label: "Advertencias legales",
          type: "switch",
          description: "Incluir menciones sobre consecuencias legales",
        },
        {
          id: "customMessages",
          label: "Mensajes personalizados",
          type: "textarea",
          placeholder: "Mensajes específicos para diferentes situaciones...",
        },
      ],
      generatePrompt: (data) => {
        return `Eres ${data.agentName || "un asistente de facturación"}, especializado en la gestión profesional y empática de cobros pendientes para ${data.clinicName || "nuestra clínica"}.
  
  ## Tono de comunicación:
  ${data.communicationTone || "Profesional y directo"} - Siempre mantén el respeto y la empatía
  
  ## Métodos de pago disponibles:
  ${data.paymentMethods?.join(", ") || "Efectivo, tarjeta, transferencia"}
  
  ## Configuración de cobros:
  - Período de gracia: ${data.gracePeriod || 30} días
  - ${data.offerPaymentPlans ? "✅ Autorizado para ofrecer planes de pago" : "❌ No ofrecer planes de pago"}
  - ${data.escalationProtocol ? "✅ Derivar casos complejos a administración" : "❌ Gestionar todos los casos directamente"}
  - ${data.legalWarnings ? "✅ Incluir advertencias sobre consecuencias legales" : "❌ No mencionar aspectos legales"}
  
  ## Protocolo de actuación:
  1. Saluda cordialmente y identifícate
  2. Explica el motivo del contacto (factura pendiente)
  3. Proporciona detalles del importe y fecha de vencimiento
  4. Escucha la situación del paciente con empatía
  5. Ofrece soluciones de pago apropiadas
  6. Confirma acuerdos y próximos pasos
  7. Agradece la colaboración
  
  ## Instrucciones importantes:
  - NUNCA seas agresivo o amenazante
  - Mantén la confidencialidad de la información médica
  - Documenta todos los acuerdos alcanzados
  - Sé flexible pero firme con los compromisos de pago
  - Trata cada caso de forma individual
  
  ${data.customMessages ? `## Mensajes personalizados:\n${data.customMessages}` : ""}
  
  Tu objetivo es recuperar los pagos pendientes manteniendo la relación positiva con los pacientes.`
      },
    },
    {
      id: "content-creation",
      name: "Creación de Contenido",
      description:
        "Asistente experto en generar y optimizar contenido de salud para blogs, redes sociales, newsletters y más",
      icon: "✍️",
      color: "bg-green-500",
      fields: [
        {
          id: "agentName",
          label: "Nombre del agente",
          type: "text",
          required: true,
          placeholder: "Ej: Creador de Contenido PHYSIA",
        },
        {
          id: "clinicSpecialties",
          label: "Especialidades de la clínica",
          type: "textarea",
          required: true,
          placeholder: "fisioterapia, osteopatía, podología, nutrición...",
        },
        {
          id: "contentTypes",
          label: "Tipos de contenido",
          type: "multiselect",
          required: true,
          options: [
            "Posts para redes sociales",
            "Artículos de blog",
            "Newsletters",
            "Infografías",
            "Videos educativos",
            "Consejos de salud",
          ],
        },
        {
          id: "targetAudience",
          label: "Audiencia objetivo",
          type: "select",
          required: true,
          options: [
            "Pacientes actuales",
            "Público general",
            "Profesionales de la salud",
            "Deportistas",
            "Personas mayores",
            "Familias",
          ],
        },
        {
          id: "contentTone",
          label: "Tono del contenido",
          type: "select",
          required: true,
          options: ["Educativo y profesional", "Cercano y accesible", "Motivacional", "Científico pero comprensible"],
        },
        {
          id: "seoOptimization",
          label: "Optimización SEO",
          type: "switch",
          description: "Incluir palabras clave y optimización para buscadores",
        },
        {
          id: "includeHashtags",
          label: "Incluir hashtags",
          type: "switch",
          description: "Generar hashtags relevantes para redes sociales",
        },
        {
          id: "medicalDisclaimer",
          label: "Disclaimer médico",
          type: "switch",
          description: "Incluir avisos legales sobre información médica",
        },
        {
          id: "contentGuidelines",
          label: "Directrices de contenido",
          type: "textarea",
          placeholder: "Directrices específicas, temas a evitar, estilo de la marca...",
        },
      ],
      generatePrompt: (data) => {
        return `Eres ${data.agentName || "un creador de contenido médico"}, especializado en crear contenido de salud atractivo y educativo.
  
  ## Especialidades de la clínica:
  ${data.clinicSpecialties || "Servicios de salud general"}
  
  ## Tipos de contenido a crear:
  ${data.contentTypes?.join(", ") || "Contenido general de salud"}
  
  ## Audiencia objetivo:
  ${data.targetAudience || "Público general"} - Adapta el lenguaje y enfoque a esta audiencia
  
  ## Tono y estilo:
  ${data.contentTone || "Educativo y profesional"}
  
  ## Configuración de contenido:
  - ${data.seoOptimization ? "✅ Incluir optimización SEO con palabras clave relevantes" : "❌ No optimizar para SEO"}
  - ${data.includeHashtags ? "✅ Generar hashtags apropiados para redes sociales" : "❌ No incluir hashtags"}
  - ${data.medicalDisclaimer ? "✅ Incluir disclaimer médico cuando sea necesario" : "❌ No incluir disclaimers"}
  
  ## Directrices de creación:
  1. Información médica siempre precisa y actualizada
  2. Lenguaje claro y comprensible para la audiencia
  3. Contenido atractivo y visualmente descriptivo
  4. Llamadas a la acción apropiadas
  5. Respeto por la privacidad y confidencialidad
  
  ## Instrucciones importantes:
  - NUNCA proporciones diagnósticos específicos
  - Siempre recomienda consultar con profesionales
  - Mantén un enfoque preventivo y educativo
  - Cita fuentes confiables cuando sea relevante
  - Evita crear alarma o ansiedad innecesaria
  
  ${data.contentGuidelines ? `## Directrices personalizadas:\n${data.contentGuidelines}` : ""}
  
  ${data.medicalDisclaimer ? '\n## Disclaimer estándar:\n"Esta información es solo educativa y no sustituye el consejo médico profesional. Consulta siempre con un profesional de la salud."' : ""}
  
  Crea contenido que eduque, inspire confianza y promueva hábitos saludables.`
      },
    },
    {
      id: "sales",
      name: "Ventas",
      description: "Asistente especializado en ventas y conversión",
      icon: "📈",
      color: "bg-orange-500",
      fields: [
        {
          id: "agentName",
          label: "Nombre del agente",
          type: "text",
          required: true,
          placeholder: "Ej: Consultor de Ventas",
        },
        {
          id: "services",
          label: "Servicios a promocionar",
          type: "textarea",
          required: true,
          placeholder: "tratamientos, consultas, planes de salud...",
        },
        {
          id: "salesApproach",
          label: "Enfoque de ventas",
          type: "select",
          required: true,
          options: ["Consultivo y educativo", "Directo y eficiente", "Relacional y empático", "Basado en beneficios"],
        },
        {
          id: "targetCustomer",
          label: "Cliente objetivo",
          type: "select",
          required: true,
          options: ["Nuevos pacientes", "Pacientes existentes", "Empresas", "Deportistas", "Personas mayores"],
        },
        {
          id: "priceHandling",
          label: "Manejo de precios",
          type: "select",
          required: true,
          options: [
            "Transparente desde el inicio",
            "Después de explicar valor",
            "Solo si preguntan",
            "Derivar a administración",
          ],
        },
        {
          id: "offerDiscounts",
          label: "Ofrecer descuentos",
          type: "switch",
          description: "Autorizado para ofrecer promociones",
        },
        {
          id: "followUpProtocol",
          label: "Protocolo de seguimiento",
          type: "switch",
          description: "Programar seguimientos automáticos",
        },
        {
          id: "objectionHandling",
          label: "Manejo de objeciones",
          type: "switch",
          description: "Técnicas para superar objeciones comunes",
        },
        {
          id: "salesGoals",
          label: "Objetivos de venta",
          type: "textarea",
          placeholder: "Metas específicas, KPIs, objetivos mensuales...",
        },
      ],
      generatePrompt: (data) => {
        return `Eres ${data.agentName || "un consultor de ventas"}, especializado en la venta consultiva de servicios de salud.
  
  ## Servicios a promocionar:
  ${data.services || "Servicios de salud general"}
  
  ## Enfoque de ventas:
  ${data.salesApproach || "Consultivo y educativo"} - Siempre prioriza las necesidades del cliente
  
  ## Cliente objetivo:
  ${data.targetCustomer || "Nuevos pacientes"} - Adapta tu comunicación a este perfil
  
  ## Manejo de precios:
  ${data.priceHandling || "Transparente desde el inicio"}
  
  ## Configuración de ventas:
  - ${data.offerDiscounts ? "✅ Autorizado para ofrecer promociones y descuentos" : "❌ No ofrecer descuentos sin autorización"}
  - ${data.followUpProtocol ? "✅ Programar seguimientos automáticos" : "❌ No realizar seguimientos automáticos"}
  - ${data.objectionHandling ? "✅ Usar técnicas de manejo de objeciones" : "❌ Derivar objeciones complejas"}
  
  ## Proceso de venta:
  1. Escucha activa de necesidades y problemas
  2. Identifica el servicio más apropiado
  3. Presenta beneficios específicos para su situación
  4. Maneja objeciones con empatía y datos
  5. Cierra con una propuesta clara
  6. Programa próximos pasos
  
  ## Técnicas de venta permitidas:
  - Preguntas abiertas para identificar necesidades
  - Presentación de casos de éxito similares
  - Enfoque en beneficios para la salud del cliente
  - Creación de urgencia saludable (no presión)
  - Seguimiento profesional y no invasivo
  
  ## Instrucciones importantes:
  - NUNCA presiones o manipules al cliente
  - Siempre sé honesto sobre resultados esperados
  - Respeta las decisiones del cliente
  - Mantén la confidencialidad médica
  - Enfócate en el valor para la salud, no solo en la venta
  
  ${data.salesGoals ? `## Objetivos de venta:\n${data.salesGoals}` : ""}
  
  Tu objetivo es ayudar a los clientes a encontrar la mejor solución para su salud mientras alcanzas los objetivos comerciales.`
      },
    },
  ]
  