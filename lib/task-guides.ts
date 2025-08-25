export interface TaskGuide {
    id: string
    title: string
    description: string
    category: "essential" | "recommended" | "advanced"
    estimatedTime: string
    steps: GuideStep[]
    tips: string[]
    relatedPages: string[]
    selfOnboarding?: boolean
    action?: {
      type: "navigate" | "modal" | "external" | "interactive-tour"
      target: string
      data?: any
    }
  }
  
  export interface GuideStep {
    title: string
    description: string
    tips: string[]
    action?: {
      text: string
      href: string
    }
    // Nuevas propiedades para tour interactivo
    target?: string // CSS selector del elemento a resaltar
    position?: "top" | "bottom" | "left" | "right" | "center"
    offset?: { x: number; y: number }
  }
  
  export const taskGuides: TaskGuide[] = [
    // TAREAS ESENCIALES
    {
      id: "setup-organization",
      title: "Configurar información de la organización",
      description: "Completa los datos básicos de tu centro médico para personalizar la plataforma.",
      category: "essential",
      estimatedTime: "5 min",
      steps: [
        {
          title: "Accede a la configuración de organización",
          description: "Navega al menú de configuración y selecciona la opción de organización para comenzar.",
          tips: ["Puedes acceder desde el menú lateral izquierdo", "La configuración se guarda automáticamente"],
        },
        {
          title: "Completa la información básica",
          description: "Rellena el nombre de tu centro, dirección y datos de contacto principales.",
          tips: ["Un nombre claro ayuda a identificar tu centro", "La dirección aparecerá en las facturas"],
        },
        {
          title: "Personaliza la apariencia",
          description: "Sube tu logo y selecciona los colores corporativos que representen tu marca.",
          tips: ["El logo debe ser en formato PNG o JPG", "Los colores se aplicarán en documentos oficiales"],
        },
      ],
      tips: [
        "Un logo profesional mejora la imagen de tu centro",
        "Los colores corporativos se aplicarán en facturas y documentos",
      ],
      relatedPages: ["/dashboard/organizations"],
      action: {
        type: "navigate",
        target: "/dashboard/organizations",
      },
    },
    {
      id: "add-professional",
      title: "Añadir tu primer profesional",
      description: "Invita a los profesionales de tu equipo para que puedan acceder al sistema.",
      category: "essential",
      estimatedTime: "3 min",
      steps: [
        {
          title: "Accede a la gestión de profesionales",
          description: "Ve al menú de profesionales para comenzar a invitar a tu equipo.",
          tips: ["Encontrarás esta opción en el menú principal", "Puedes invitar múltiples profesionales"],
        },
        {
          title: "Completa los datos del profesional",
          description: "Introduce el email, nombre completo y selecciona el rol apropiado para el nuevo miembro.",
          tips: ["El email debe ser válido para recibir la invitación", "Los roles determinan los permisos de acceso"],
        },
        {
          title: "Envía la invitación",
          description: "Confirma los datos y envía la invitación. El profesional recibirá un email con acceso.",
          tips: ["La invitación incluye un enlace seguro", "Puedes reenviar invitaciones si es necesario"],
        },
      ],
      tips: [
        "El profesional recibirá un email con instrucciones de acceso",
        "Puedes cambiar los roles más tarde si es necesario",
      ],
      relatedPages: ["/dashboard/professionals"],
      action: {
        type: "modal",
        target: "invite-professional",
      },
    },
    {
      id: "add-first-client",
      title: "Registrar tu primer cliente",
      description: "Añade la información de tu primer paciente al sistema.",
      category: "essential",
      estimatedTime: "4 min",
      steps: [
        {
          title: "Accede a la sección de clientes",
          description: "Navega al menú de clientes para comenzar a registrar pacientes.",
          tips: ["Los clientes son la base de tu sistema", "Puedes importar clientes desde Excel"],
        },
        {
          title: "Completa los datos personales",
          description: "Introduce nombre, apellidos, teléfono, email y fecha de nacimiento del paciente.",
          tips: ["Todos los campos son importantes para el seguimiento", "El teléfono es esencial para comunicaciones"],
        },
        {
          title: "Añade información médica",
          description: "Incluye historial médico, alergias y notas relevantes para el tratamiento.",
          tips: ["Esta información ayuda en futuras consultas", "Puedes actualizar el historial en cualquier momento"],
        },
      ],
      tips: [
        "Completa toda la información posible para un mejor seguimiento",
        "Puedes añadir fotos y documentos más tarde",
      ],
      relatedPages: ["/dashboard/clients"],
      action: {
        type: "navigate",
        target: "/dashboard/clients/new",
      },
    },
    {
      id: "create-service",
      title: "Crear tu primer servicio",
      description: "Define los servicios que ofrece tu centro médico.",
      category: "essential",
      estimatedTime: "3 min",
      steps: [
        {
          title: "Accede a la configuración de servicios",
          description: "Ve al menú de servicios para comenzar a definir lo que ofreces.",
          tips: ["Los servicios aparecerán en el calendario", "Puedes crear servicios grupales e individuales"],
        },
        {
          title: "Define el servicio",
          description: "Introduce nombre, descripción, precio y duración estimada del servicio.",
          tips: ["Un nombre claro ayuda en la programación", "La duración se usa para calcular horarios"],
        },
        {
          title: "Asigna profesionales",
          description: "Selecciona qué profesionales pueden realizar este servicio.",
          tips: ["Un servicio puede tener múltiples profesionales", "Esto afecta la disponibilidad en el calendario"],
        },
      ],
      tips: ["Los servicios aparecerán en el calendario y facturación", "Puedes crear servicios grupales e individuales"],
      relatedPages: ["/dashboard/services"],
      action: {
        type: "navigate",
        target: "/dashboard/services/new",
      },
    },
  
    // TAREAS RECOMENDADAS
    {
      id: "schedule-appointment",
      title: "Programar tu primera cita",
      description:
        "Aprende a usar el calendario para gestionar citas de tus pacientes, desde elegir fecha hasta enviar la confirmación.",
      category: "recommended",
      estimatedTime: "10 min",
      selfOnboarding: true,
      steps: [
        {
          title: "Bienvenido al calendario médico",
          description:
            "Este es tu calendario principal donde podrás gestionar todas las citas de tus pacientes. Aquí verás las citas programadas, podrás crear nuevas y gestionar tu agenda diaria. El calendario es el corazón del sistema de gestión médica.",
          tips: [
            "El calendario es el corazón del sistema de gestión.",
            "Puedes cambiar entre vista de día, semana o mes según tus necesidades.",
            "Las citas se muestran con colores diferentes según el profesional.",
            "Cada cita muestra información básica del paciente y el tipo de consulta.",
          ],
          target: "[data-tour='calendar-view']",
          position: "center",
        },
        {
          title: "Crear nueva cita con el botón '+'",
          description:
            "Haz clic en este botón '+' para crear una nueva cita. Este es el punto de partida para programar cualquier cita con tus pacientes. Podrás buscar pacientes existentes o crear nuevos directamente desde el formulario.",
          tips: [
            "También puedes crear citas haciendo clic directamente en una hora del calendario.",
            "El botón está siempre visible para acceso rápido.",
            "Puedes programar citas para cualquier profesional de tu equipo.",
            "Si el paciente no existe, se creará automáticamente.",
          ],
          target: "[data-tour='new-appointment-btn']",
          position: "bottom",
        },
        {
          title: "Botón de facturar día",
          description:
            "Este botón te permite generar facturas para todas las citas completadas del día seleccionado. Es una herramienta muy útil para agilizar el proceso de facturación diaria y mantener al día la contabilidad de tu centro.",
          tips: [
            "Solo aparece en la vista diaria del calendario.",
            "Genera facturas automáticamente para citas completadas.",
            "Puedes revisar y modificar las facturas antes de enviarlas.",
            "Ahorra tiempo al procesar múltiples facturas de una vez.",
          ],
          target: "[data-tour='daily-billing-btn']",
          position: "bottom",
        },
        {
          title: "Herramientas de navegación y filtros",
          description:
            "Aquí tienes las herramientas principales: la lupa para buscar citas específicas, el filtro de profesionales para mostrar solo ciertos usuarios, y el selector de intervalos de tiempo para ajustar la granularidad del calendario.",
          tips: [
            "La lupa te permite buscar citas por nombre de paciente o profesional.",
            "El filtro de profesionales te ayuda a enfocarte en usuarios específicos.",
            "Los intervalos de tiempo (15, 30, 45, 60 min) ajustan la vista del calendario.",
            "Todos estos filtros se combinan para personalizar tu vista.",
          ],
          target: "[data-tour='search-btn']",
          position: "bottom",
        },
        {
          title: "Vistas temporales: Día, Semana, Mes",
          description:
            "Cambia entre diferentes vistas temporales según tus necesidades. La vista diaria te da máximo detalle, la semanal te permite planificar mejor, y la mensual te da una perspectiva general de tu agenda.",
          tips: [
            "Vista diaria: perfecta para el día a día y gestión detallada.",
            "Vista semanal: ideal para planificación y ver patrones semanales.",
            "Vista mensual: excelente para planificación a largo plazo.",
            "Puedes cambiar de vista en cualquier momento sin perder información.",
          ],
          target: "[data-tour='time-view-tabs']",
          position: "bottom",
        },
        {
          title: "Vistas de presentación: Horario y Lista",
          description:
            "Elige cómo quieres ver tus citas: en formato de horario visual (como un calendario tradicional) o en formato de lista (más compacto y fácil de revisar). Ambas vistas muestran la misma información pero de manera diferente.",
          tips: [
            "Vista horario: visual e intuitiva, perfecta para ver huecos libres.",
            "Vista lista: compacta y eficiente, ideal para revisar muchas citas.",
            "Ambas vistas se actualizan en tiempo real.",
            "Puedes alternar entre ambas según la tarea que estés realizando.",
          ],
          target: "[data-tour='presentation-view-tabs']",
          position: "bottom",
        },
        {
          title: "Lista de espera - Gestión de pacientes pendientes",
          description:
            "La lista de espera te permite gestionar pacientes que quieren una cita pero no hay disponibilidad inmediata. Desde aquí puedes programar citas cuando se liberen huecos y mantener organizados a los pacientes pendientes.",
          tips: [
            "Añade pacientes cuando no hay disponibilidad inmediata.",
            "Programa citas directamente desde la lista cuando se liberen huecos.",
            "Mantén notas sobre preferencias de horario y profesional.",
            "Los pacientes se eliminan automáticamente al programar su cita.",
          ],
          target: "[data-tour='waiting-list-tab']",
          position: "bottom",
        },
        {
          title: "Actividades grupales - Clases y talleres",
          description:
            "Las actividades grupales te permiten gestionar clases, talleres o sesiones con múltiples participantes. Es ideal para centros que ofrecen terapias grupales, clases de ejercicio o talleres educativos.",
          tips: [
            "Crea actividades con múltiples participantes.",
            "Gestiona listas de asistencia y participación.",
            "Programa actividades recurrentes fácilmente.",
            "Controla la capacidad máxima de cada actividad.",
          ],
          target: "[data-tour='group-activities-tab']",
          position: "bottom",
        },
        {
          title: "Gestión de actividades grupales creadas",
          description:
            "Una vez creadas las actividades grupales, puedes gestionarlas completamente: añadir o quitar participantes, editar detalles de la actividad, cambiar horarios, y eliminar actividades si es necesario. Todo desde una interfaz intuitiva.",
          tips: [
            "Añade participantes con el botón '+' en cada actividad.",
            "Edita detalles haciendo clic en el icono de edición.",
            "Elimina actividades con el icono de papelera.",
            "Ve la lista completa de participantes en cada actividad.",
            "Las actividades se sincronizan automáticamente con el calendario principal.",
          ],
          target: "[data-tour='group-activities-content']",
          position: "right",
        },
        {
          title: "Usuarios - Configuración de horarios y descansos",
          description:
            "Desde esta pestaña puedes gestionar a todas las personas de tu equipo. Aquí podrás configurar los horarios de trabajo y los descansos de cada usuario para su calendario de citas, haciendo clic en el botón del reloj.",
          tips: [
            "Define horarios diferentes para cada día de la semana.",
            "Configura descansos automáticos para evitar citas consecutivas.",
            "Establece días libres y vacaciones por profesional.",
            "Los horarios configurados afectan la disponibilidad en el calendario.",
            "Puedes crear horarios especiales para días festivos o eventos.",
          ],
          target: "[data-tour='users-tab']",
          position: "bottom",
        },
        {
          title: "Consultas - Gestión de salas de la clínica",
          description:
            "La pestaña de Consultas te permite crear y gestionar las consultas o salas de tu clínica. Podrás enlazarlas con pacientes o profesionales para optimizar el uso de tus espacios.",
          tips: [
            "Crea consultorios con nombres descriptivos (Sala 1, Consulta A, etc.).",
            "Asigna salas específicas a profesionales o servicios.",
            "Controla la capacidad y equipamiento de cada consultorio.",
            "Las salas aparecen como opción al programar citas.",
            "Puedes ver la ocupación de cada sala en tiempo real.",
          ],
          target: "[data-tour='consultations-tab']",
          position: "bottom",
        },
        {
          title: "Servicios - Catálogo de tratamientos disponibles",
          description:
            "En la pestaña de Servicios puedes gestionar todo el catálogo de tratamientos y servicios que ofrece tu centro. Define precios, duraciones, descripciones y asigna qué profesionales pueden realizar cada servicio. Esta información se usa automáticamente al crear citas y generar facturas.",
          tips: [
            "Crea servicios individuales y grupales según tus necesidades.",
            "Define precios y duraciones precisas para cada tratamiento.",
            "Asigna profesionales específicos a cada tipo de servicio.",
            "Los servicios aparecen automáticamente al crear citas.",
            "Puedes crear paquetes de servicios con descuentos especiales.",
          ],
          target: "[data-tour='services-tab']",
          position: "bottom",
        },
      ],
      tips: [
        "Las citas se sincronizan automáticamente con el calendario del profesional.",
        "Configura recordatorios automáticos para mejorar la asistencia.",
        "Puedes duplicar una cita para agendar seguimientos rápidos.",
        "La lista de espera te ayuda a optimizar la ocupación de tu agenda.",
        "Las actividades grupales son perfectas para maximizar la eficiencia.",
        "Mantén actualizados los horarios, consultorios y servicios para un mejor funcionamiento.",
      ],
      relatedPages: ["/dashboard"],
      action: {
        type: "interactive-tour",
        target: "/dashboard?tour=schedule-appointment",
      },
    },
    {
      id: "manage-clients",
      title: "Gestionar clientes y pacientes",
      description:
        "Aprende a gestionar tu base de datos de clientes: crear, buscar, editar y organizar toda la información de tus pacientes de manera eficiente.",
      category: "recommended",
      estimatedTime: "5 min",
      steps: [
        {
          title: "Crear nuevo cliente",
          description:
            "Haz clic en este botón para registrar un nuevo cliente en tu sistema. Podrás introducir toda su información personal, médica y de contacto. Es el primer paso para comenzar a gestionar un nuevo paciente.",
          tips: [
            "Completa toda la información posible para un mejor seguimiento.",
            "Los campos obligatorios están marcados con asterisco.",
            "Puedes añadir información médica y alergias importantes.",
            "La información se guarda automáticamente al crear el cliente.",
          ],
          target: "#new-client-btn",
          position: "left",
        },
        {
          title: "Importar clientes desde archivo",
          description:
            "Si ya tienes una base de datos de clientes en Excel o CSV, puedes importarlos masivamente con este botón. Es perfecto para migrar desde otros sistemas o para añadir múltiples clientes de una vez.",
          tips: [
            "Acepta archivos Excel (.xlsx) y CSV.",
            "Descarga la plantilla para ver el formato correcto.",
            "Puedes importar cientos de clientes en segundos.",
            "El sistema detecta y evita duplicados automáticamente.",
          ],
          target: "#import-clients-btn",
          position: "left",
        },
        {
          title: "Buscador inteligente de clientes",
          description:
            "Utiliza este buscador para encontrar rápidamente cualquier cliente. Puedes buscar por nombre, teléfono, email, NIF o ciudad. Los resultados se filtran automáticamente mientras escribes, resaltando las coincidencias.",
          tips: [
            "La búsqueda es instantánea mientras escribes.",
            "Busca por cualquier campo: nombre, teléfono, email, NIF o ciudad.",
            "Los resultados se resaltan para fácil identificación.",
            "Usa la X para limpiar la búsqueda rápidamente.",
          ],
          target: "#clients-search-input",
          position: "bottom",
        },
      ],
      tips: [
        "Mantén actualizada la información de contacto de tus clientes.",
        "Usa el buscador para encontrar rápidamente cualquier cliente.",
        "La importación masiva ahorra tiempo al migrar desde otros sistemas.",
        "Revisa regularmente la información de tus clientes más frecuentes.",
      ],
      relatedPages: ["/dashboard/clients"],
      action: {
        type: "interactive-tour",
        target: "/dashboard/clients?tour=manage-clients",
      },
    },
    {
      id: "patient-management",
      title: "Gestión completa del paciente",
      description:
        "Aprende a gestionar toda la información de un paciente: datos personales, historial médico, seguimiento, citas, consentimientos y tarjetas de fidelización.",
      category: "recommended",
      estimatedTime: "12 min",
      selfOnboarding: true,
      steps: [
        {
          title: "Bienvenido al perfil del paciente",
          description:
            "Esta es la vista completa de un paciente donde puedes gestionar toda su información médica y personal. Desde aquí tienes acceso a su historial completo, citas programadas, seguimientos y documentos.",
          tips: [
            "Toda la información del paciente está centralizada aquí.",
            "Puedes navegar entre diferentes secciones usando las pestañas.",
            "Los cambios se guardan automáticamente.",
            "Esta vista es el centro de control para cada paciente.",
          ],
          target: "[data-tour='patient-header']",
          position: "bottom",
        },
        {
          title: "Pestañas de navegación del paciente",
          description:
            "Estas pestañas te permiten navegar entre las diferentes secciones del paciente: resumen general, información personal detallada, historial médico completo, seguimiento de tratamientos, tarjetas de fidelización, citas programadas y consentimientos firmados.",
          tips: [
            "Cada pestaña contiene información específica del paciente.",
            "Puedes cambiar entre pestañas sin perder los cambios no guardados.",
            "El número entre paréntesis indica la cantidad de elementos en cada sección.",
            "Las pestañas se adaptan según el rol del usuario (coordinadores ven menos opciones).",
          ],
          target: "[data-tour='patient-tabs']",
          position: "bottom",
        },
        {
          title: "Botón de editar información",
          description:
            "Este botón te permite editar la información del paciente. Al hacer clic, los campos se vuelven editables y puedes modificar cualquier dato personal, de contacto o médico del paciente.",
          tips: [
            "Solo aparece cuando no estás en modo edición.",
            "Al activar la edición, aparecen botones de guardar y cancelar.",
            "Puedes editar múltiples campos antes de guardar.",
            "Los cambios se validan antes de guardarse.",
          ],
          target: "[data-tour='edit-patient-btn']",
          position: "left",
        },
        {
          title: "Generar informe clínico",
          description:
            "Este botón genera un informe clínico completo del paciente con toda su información médica, historial de citas, tratamientos realizados y evolución. Es perfecto para derivaciones o informes médicos oficiales.",
          tips: [
            "El informe incluye toda la información médica relevante.",
            "Se genera en formato PDF profesional.",
            "Incluye datos de la organización y firma digital.",
            "Perfecto para derivaciones a otros especialistas.",
          ],
          target: "[data-tour='generate-report-btn']",
          position: "left",
        },
        {
          title: "Información personal del paciente",
          description:
            "En esta sección puedes ver y editar toda la información personal del paciente: nombre, fecha de nacimiento, edad, ID del paciente, tipo de cliente (privado o público), información de contacto y dirección completa.",
          tips: [
            "La edad se calcula automáticamente desde la fecha de nacimiento.",
            "El tipo de cliente afecta la facturación y documentos.",
            "Los clientes públicos requieren códigos DIR3 adicionales.",
            "Mantén actualizada la información de contacto para comunicaciones.",
          ],
          target: "[data-tour='personal-info-section']",
          position: "right",
        },
        {
          title: "Historial de visitas y estadísticas",
          description:
            "Esta sección muestra un resumen estadístico del paciente: fecha de la última visita, próxima cita programada, total de historias clínicas y historias activas. Te da una vista rápida del estado del paciente.",
          tips: [
            "Las estadísticas se actualizan automáticamente.",
            "La próxima cita se resalta en verde si está programada.",
            "El total de historias incluye todos los registros médicos.",
            "Las historias activas son tratamientos en curso.",
          ],
          target: "[data-tour='visit-history-section']",
          position: "left",
        },
        {
          title: "Pestañas del historial médico",
          description:
            "El historial médico está organizado en pestañas temáticas: motivo de consulta, enfermedad actual, antecedentes personales y familiares, hábitos de vida, revisión por sistemas, función neurológica/psicológica, exploración física y diagnóstico con tratamiento.",
          tips: [
            "Cada pestaña agrupa información médica relacionada.",
            "Puedes navegar libremente entre pestañas.",
            "Los iconos ayudan a identificar rápidamente cada sección.",
            "Toda la información se guarda de forma integrada.",
          ],
          target: "[data-tour='medical-tabs']",
          position: "bottom",
        },
        {
          title: "Botones de edición del historial médico",
          description:
            "Estos botones te permiten editar el historial médico completo del paciente. Al activar la edición, todos los campos se vuelven editables y aparecen opciones para añadir campos personalizados en cada sección.",
          tips: [
            "El modo edición afecta a todas las pestañas del historial.",
            "Puedes añadir campos personalizados en cualquier sección.",
            "Los cambios se guardan todos juntos al final.",
            "Siempre puedes cancelar y volver al estado anterior.",
          ],
          target: "[data-tour='medical-edit-buttons']",
          position: "left",
        },
        {
          title: "Sección de seguimiento del paciente",
          description:
            "La pestaña de seguimiento te permite registrar la evolución del paciente a lo largo del tiempo. Puedes añadir nuevos seguimientos, ver estadísticas de evolución y gestionar el plan de tratamiento continuado.",
          tips: [
            "Cada seguimiento incluye fecha, tipo, descripción y recomendaciones.",
            "Las estadísticas muestran la frecuencia y tipos de seguimiento.",
            "Puedes programar recordatorios para próximas revisiones.",
            "El historial de seguimiento ayuda a evaluar la efectividad del tratamiento.",
          ],
          target: "[data-tour='follow-up-section']",
          position: "center",
        },
        {
          title: "Gestión de tarjetas de fidelización",
          description:
            "En esta pestaña puedes gestionar las tarjetas de fidelización del paciente. Puedes crear nuevas tarjetas, registrar sesiones completadas, canjear recompensas y ver el historial de uso del programa de fidelidad.",
          tips: [
            "Las tarjetas motivan la continuidad del tratamiento.",
            "Puedes registrar sesiones directamente desde aquí.",
            "Las recompensas se pueden canjear automáticamente.",
            "El historial muestra el engagement del paciente.",
          ],
          target: "[data-tour='loyalty-cards-section']",
          position: "center",
        },
        {
          title: "Calendario de citas del paciente",
          description:
            "Esta sección muestra todas las citas programadas para el paciente, tanto futuras como pasadas. Puedes ver detalles de cada cita, el profesional asignado, el servicio realizado y el estado de la cita.",
          tips: [
            "Las citas futuras aparecen primero.",
            "Puedes ver el profesional y servicio de cada cita.",
            "Los estados indican si la cita está confirmada, completada o cancelada.",
            "Desde aquí puedes acceder al calendario principal para programar nuevas citas.",
          ],
          target: "[data-tour='appointments-section']",
          position: "center",
        },
        {
          title: "Consentimientos informados",
          description:
            "La última pestaña gestiona todos los consentimientos informados del paciente. Puedes generar nuevos consentimientos, ver los ya firmados, gestionar enlaces pendientes y descargar documentos completos con firmas digitales.",
          tips: [
            "Los consentimientos son legalmente vinculantes.",
            "Puedes generar diferentes tipos según el tratamiento.",
            "Las firmas digitales tienen validez legal.",
            "Los documentos se pueden descargar en PDF completo.",
          ],
          target: "[data-tour='consents-section']",
          position: "center",
        },
      ],
      tips: [
        "Utiliza las pestañas para organizar la información del paciente de forma lógica.",
        "El historial médico completo mejora la calidad de la atención.",
        "Los seguimientos regulares aumentan la efectividad del tratamiento.",
        "Los consentimientos informados protegen legalmente tu práctica.",
        "Las tarjetas de fidelización mejoran la retención de pacientes.",
        "Mantén siempre actualizada la información de contacto del paciente.",
      ],
      relatedPages: ["/dashboard/clients"],
      action: {
        type: "interactive-tour",
        target: "/dashboard/clients/1?tour=patient-management",
      },
    },
    {
      id: "task-management",
      title: "Gestión de tareas del equipo",
      description:
        "Aprende a usar el sistema de tareas Kanban para organizar y gestionar el trabajo de tu equipo médico de manera eficiente.",
      category: "recommended",
      estimatedTime: "8 min",
      steps: [
        {
          title: "Crear nueva tarea",
          description:
            "Este botón te permite crear una nueva tarea para tu equipo. Podrás asignar la tarea a uno o varios profesionales, establecer prioridades, fechas de vencimiento y añadir toda la información necesaria para completar el trabajo.",
          tips: [
            "Puedes asignar una tarea a múltiples profesionales.",
            "Establece prioridades claras: alta, media o baja.",
            "Las fechas de vencimiento ayudan a mantener el control.",
            "Añade descripciones detalladas para evitar confusiones.",
          ],
          target: "[data-tour='new-task-btn']",
          position: "bottom",
        },
        {
          title: "Filtros de tareas",
          description:
            "Los filtros te permiten personalizar la vista de tareas según tus necesidades. Puedes filtrar por estado (creadas, archivadas, eliminadas), por profesional asignado, por prioridad, o buscar tareas específicas por texto.",
          tips: [
            "Usa los filtros para enfocarte en tareas específicas.",
            "El filtro por profesional te ayuda a ver la carga de trabajo individual.",
            "Puedes combinar múltiples filtros para búsquedas precisas.",
            "El botón 'Limpiar' restaura todos los filtros a su estado inicial.",
          ],
          target: "[data-tour='filters-btn']",
          position: "bottom",
        },
        {
          title: "Columna 'Por Hacer'",
          description:
            "Esta columna contiene todas las tareas que están pendientes de comenzar. Es el punto de partida del flujo de trabajo. Las tareas nuevas aparecen aquí automáticamente y pueden ser arrastradas a otras columnas cuando se comience a trabajar en ellas.",
          tips: [
            "Las tareas nuevas aparecen automáticamente en esta columna.",
            "Puedes arrastrar tareas directamente a otras columnas.",
            "El número en el badge muestra cuántas tareas hay pendientes.",
            "Las tareas vencidas se marcan con un badge rojo.",
          ],
          target: "[data-tour='pending-column']",
          position: "top",
        },
        {
          title: "Columna 'En Progreso'",
          description:
            "Aquí se ubican las tareas que están siendo trabajadas actualmente. Esta columna representa el trabajo activo del equipo. Muestra qué tareas están en desarrollo y quién las está realizando.",
          tips: [
            "Arrastra tareas desde 'Por Hacer' cuando comiences a trabajar en ellas.",
            "Esta columna muestra el trabajo activo del equipo.",
            "Puedes ver quién está trabajando en cada tarea.",
            "Las tareas que vencen pronto se marcan con un badge naranja.",
          ],
          target: "[data-tour='progress-column']",
          position: "top",
        },
        {
          title: "Columna 'Completadas'",
          description:
            "Las tareas finalizadas se mueven a esta columna. Representa el trabajo completado y permite hacer seguimiento de la productividad del equipo. Las tareas completadas mantienen su historial completo para referencia futura.",
          tips: [
            "Arrastra tareas aquí cuando estén completamente terminadas.",
            "Las tareas completadas mantienen todo su historial.",
            "Puedes revisar el trabajo completado para evaluaciones de rendimiento.",
            "Las tareas completadas se marcan automáticamente con la fecha de finalización.",
          ],
          target: "[data-tour='completed-column']",
          position: "top",
        },
        {
          title: "Tarjeta de tarea individual",
          description:
            "Cada tarea se representa con una tarjeta que muestra información clave: título, descripción, prioridad, usuarios asignados y fecha de vencimiento. Las tarjetas son interactivas y se pueden arrastrar entre columnas para cambiar su estado.",
          tips: [
            "El título debe ser claro y descriptivo.",
            "La prioridad se muestra con colores: rojo (alta), amarillo (media), verde (baja).",
            "Puedes ver todos los usuarios asignados en la parte inferior.",
            "Las fechas de vencimiento aparecen con un icono de calendario.",
          ],
          target: "[data-tour='task-card']",
          position: "right",
        },
        {
          title: "Botones de acción de la tarea",
          description:
            "Cada tarea tiene tres botones de acción: Editar (azul) para modificar la información, Archivar (naranja) para guardar sin eliminar, y Eliminar (rojo) para borrar definitivamente. Estos botones te dan control completo sobre cada tarea.",
          tips: [
            "El botón azul (editar) abre el formulario completo de la tarea.",
            "El botón naranja (archivar) guarda la tarea sin eliminarla.",
            "El botón rojo (eliminar) borra la tarea permanentemente.",
            "Las tareas archivadas se pueden restaurar más tarde.",
          ],
          target: "[data-tour='edit-task-btn']",
          position: "left",
        },
      ],
      tips: [
        "Usa el sistema Kanban para visualizar el flujo de trabajo del equipo.",
        "Asigna tareas específicas a profesionales para mantener la responsabilidad.",
        "Las prioridades ayudan a enfocar el trabajo en lo más importante.",
        "Revisa regularmente las tareas vencidas y próximas a vencer.",
        "Las tareas archivadas mantienen el historial sin saturar la vista principal.",
        "Usa descripciones detalladas para evitar malentendidos en el equipo.",
      ],
      relatedPages: ["/dashboard/tareas"],
      action: {
        type: "interactive-tour",
        target: "/dashboard/tareas?tour=task-management",
      },
    },
    {
      id: "time-tracking-system",
      title: "Sistema de control horario",
      description:
        "Aprende a usar el sistema completo de fichaje: desde registrar entrada y salida hasta gestionar solicitudes de vacaciones y generar reportes de jornadas laborales.",
      category: "recommended",
      estimatedTime: "10 min",
      steps: [
        {
          title: "Bienvenido al sistema de control horario",
          description:
            "Este es el centro de control para gestionar todo lo relacionado con el tiempo de trabajo de tu equipo. Desde aquí puedes fichar entrada y salida, ver registros históricos, gestionar solicitudes de vacaciones y generar reportes completos de jornadas laborales.",
          tips: [
            "El sistema registra automáticamente todas las entradas y salidas.",
            "Los administradores pueden ver y gestionar el tiempo de todo el equipo.",
            "Todos los datos se almacenan de forma segura y se pueden exportar.",
            "El sistema calcula automáticamente horas trabajadas y pausas.",
          ],
          target: "[data-tour='time-tracking-header']",
          position: "bottom",
        },
        {
          title: "Pestañas del sistema de fichaje",
          description:
            "El sistema está organizado en cuatro pestañas principales: Fichar (para registrar entrada/salida), Registros (historial de jornadas), Solicitudes (gestión de vacaciones y permisos), y Calendario (vista mensual de solicitudes aprobadas).",
          tips: [
            "Cada pestaña tiene una función específica en el control horario.",
            "Los badges rojos indican solicitudes pendientes de aprobación.",
            "Puedes navegar libremente entre pestañas sin perder información.",
            "Los iconos ayudan a identificar rápidamente cada sección.",
          ],
          target: "[data-tour='time-tracking-tabs']",
          position: "bottom",
        },
        {
          title: "Selector de empleados (solo administradores)",
          description:
            "Como administrador, puedes seleccionar cualquier empleado de tu organización para ver sus registros o fichar en su nombre. Esta funcionalidad es útil para gestionar el tiempo de todo el equipo desde una sola interfaz.",
          tips: [
            "Solo los administradores ven este selector.",
            "Puedes cambiar entre empleados sin perder el contexto.",
            "El empleado seleccionado se mantiene al cambiar de pestaña.",
            "Útil para resolver incidencias o registros olvidados.",
          ],
          target: "[data-tour='user-selector']",
          position: "right",
        },
        {
          title: "Reloj de fichaje principal",
          description:
            "Este es el corazón del sistema de fichaje. Muestra la hora actual, el estado del empleado (dentro/fuera), y los botones para registrar entrada, salida y pausas. El sistema detecta automáticamente si es una entrada o salida según el último registro.",
          tips: [
            "El botón cambia automáticamente entre 'Entrar' y 'Salir'.",
            "Puedes añadir notas opcionales a cada fichaje.",
            "Las pausas se registran por separado y se descuentan del tiempo total.",
            "El sistema muestra el tiempo transcurrido desde la última acción.",
          ],
          target: "[data-tour='time-clock']",
          position: "left",
        },
        {
          title: "Filtros de fechas para registros",
          description:
            "Utiliza estos filtros para buscar registros en períodos específicos. Puedes filtrar por fecha de inicio, fecha de fin, o usar rangos predefinidos como 'última semana' o 'último mes'. Los filtros se aplican automáticamente a la tabla de registros.",
          tips: [
            "Los filtros se aplican automáticamente al cambiar las fechas.",
            "Puedes usar rangos personalizados o predefinidos.",
            "El botón 'Limpiar' restaura la vista completa.",
            "Los filtros afectan también a las exportaciones de datos.",
          ],
          target: "[data-tour='date-filters']",
          position: "bottom",
        },
        {
          title: "Tabla de registros de jornadas",
          description:
            "Esta tabla muestra el historial completo de jornadas laborales. Incluye fecha, horas de entrada y salida, número de pausas, tiempo total de pausas, tiempo neto trabajado, estado de la jornada y notas adicionales. Los datos se pueden ordenar y exportar.",
          tips: [
            "Haz clic en las columnas para ordenar los datos.",
            "Los registros incompletos se marcan en color diferente.",
            "Puedes editar registros haciendo clic en el icono de edición.",
            "La paginación permite navegar por grandes volúmenes de datos.",
          ],
          target: "[data-tour='work-sessions-table']",
          position: "top",
        },
        {
          title: "Botones de acción de la tabla",
          description:
            "Estos botones te permiten interactuar con los datos: Exportar genera un archivo CSV con todos los registros filtrados, Actualizar recarga los datos más recientes, y el botón de edición (en cada fila) permite modificar registros específicos.",
          tips: [
            "La exportación incluye todos los registros filtrados.",
            "El archivo CSV se puede abrir en Excel o Google Sheets.",
            "La actualización es útil cuando varios usuarios fichan simultáneamente.",
            "Solo los administradores pueden editar registros de otros usuarios.",
          ],
          target: "[data-tour='table-actions']",
          position: "left",
        },
        {
          title: "Gestión de solicitudes de vacaciones",
          description:
            "En la pestaña de Solicitudes puedes crear nuevas solicitudes de vacaciones, permisos o días libres. También puedes ver el estado de tus solicitudes pendientes y, si eres administrador, aprobar o rechazar solicitudes de tu equipo.",
          tips: [
            "Las solicitudes requieren aprobación del administrador.",
            "Puedes solicitar días completos o medias jornadas.",
            "El sistema calcula automáticamente los días disponibles.",
            "Las solicitudes aprobadas aparecen en el calendario.",
          ],
          target: "[data-tour='vacation-requests']",
          position: "center",
        },
        {
          title: "Calendario de vacaciones y permisos",
          description:
            "El calendario muestra una vista mensual de todas las solicitudes aprobadas de vacaciones y permisos. Los diferentes tipos de solicitudes se muestran con colores distintos, y puedes navegar entre meses para planificar mejor los recursos del equipo.",
          tips: [
            "Cada tipo de solicitud tiene un color diferente.",
            "Puedes ver las solicitudes de todo el equipo o solo las tuyas.",
            "Útil para planificar la cobertura del equipo.",
            "Las solicitudes pendientes aparecen con un estilo diferente.",
          ],
          target: "[data-tour='vacation-calendar']",
          position: "center",
        },
      ],
      tips: [
        "Ficha siempre al llegar y al salir para mantener registros precisos.",
        "Usa las notas para documentar situaciones especiales o incidencias.",
        "Los administradores deben revisar regularmente las solicitudes pendientes.",
        "Exporta los datos mensualmente para mantener registros de nómina.",
        "Las pausas se descuentan automáticamente del tiempo total trabajado.",
        "El sistema funciona desde cualquier dispositivo con acceso a internet.",
      ],
      relatedPages: ["/dashboard/fichaje"],
      action: {
        type: "interactive-tour",
        target: "/dashboard/fichaje?tour=time-tracking-system",
      },
    },
    {
      id: "create-invoice",
      title: "Generar tu primera factura",
      description: "Aprende el proceso de facturación para tus servicios.",
      category: "recommended",
      estimatedTime: "6 min",
      steps: [
        {
          title: "Accede a la sección de facturación",
          description: "Navega al menú de facturación para comenzar a generar facturas.",
          tips: ["Puedes facturar desde citas completadas", "Las facturas se numeran automáticamente"],
        },
        {
          title: "Selecciona el cliente",
          description: "Elige el cliente para quien vas a generar la factura.",
          tips: ["Puedes ver el historial de facturas del cliente", "Los datos se completan automáticamente"],
        },
        {
          title: "Añade servicios realizados",
          description: "Selecciona los servicios prestados y ajusta cantidades si es necesario.",
          tips: ["Los precios se toman de la configuración de servicios", "Puedes aplicar descuentos si es necesario"],
        },
        {
          title: "Genera y envía",
          description: "Revisa el total, genera la factura y envíala al cliente por email.",
          tips: ["La factura se guarda automáticamente", "Puedes descargar una copia en PDF"],
        },
      ],
      tips: ["Las facturas se numeran automáticamente", "Puedes personalizar el diseño de las facturas"],
      relatedPages: ["/dashboard/facturacion/invoices"],
      action: {
        type: "navigate",
        target: "/dashboard/facturacion/invoices/new",
      },
    },
    {
      id: "setup-whatsapp",
      title: "Configurar WhatsApp Business",
      description: "Conecta WhatsApp para comunicarte directamente con tus pacientes.",
      category: "recommended",
      estimatedTime: "8 min",
      steps: [
        {
          title: "Accede a la configuración de canales",
          description: "Ve al menú de canales para configurar WhatsApp Business.",
          tips: ["Necesitas una cuenta de WhatsApp Business", "El proceso es gratuito y rápido"],
        },
        {
          title: "Conecta tu número",
          description: "Introduce tu número de WhatsApp Business y verifica la conexión.",
          tips: ["Usa un número dedicado para el negocio", "La verificación puede tardar unos minutos"],
        },
        {
          title: "Configura mensajes automáticos",
          description: "Define plantillas para recordatorios de citas y mensajes de bienvenida.",
          tips: ["Los mensajes automáticos ahorran tiempo", "Puedes personalizar cada plantilla"],
        },
        {
          title: "Prueba y activa",
          description: "Envía un mensaje de prueba y activa las notificaciones automáticas.",
          tips: ["Prueba con tu propio número primero", "Las notificaciones mejoran la asistencia"],
        },
      ],
      tips: ["WhatsApp Business es gratuito y muy efectivo", "Puedes enviar recordatorios de citas automáticamente"],
      relatedPages: ["/dashboard/canales"],
      action: {
        type: "navigate",
        target: "/dashboard/canales",
      },
    },
  
    // TAREAS AVANZADAS
    {
      id: "setup-loyalty-program",
      title: "Configurar programa de fidelización",
      description: "Crea tarjetas de fidelidad para retener a tus mejores clientes.",
      category: "advanced",
      estimatedTime: "10 min",
      steps: [
        {
          title: "Accede al programa de fidelización",
          description: "Ve al menú de marketing para configurar las tarjetas de fidelidad.",
          tips: ["Los programas de fidelidad aumentan la retención", "Puedes crear múltiples tipos de tarjetas"],
        },
        {
          title: "Diseña tu tarjeta",
          description: "Personaliza el diseño, colores y logo de tu tarjeta de fidelidad.",
          tips: ["Un diseño atractivo motiva a los clientes", "Usa los colores de tu marca"],
        },
        {
          title: "Define reglas de puntos",
          description: "Establece cómo se ganan puntos y qué recompensas se pueden obtener.",
          tips: ["Las reglas deben ser claras y justas", "Ofrece recompensas atractivas pero sostenibles"],
        },
        {
          title: "Asigna y monitorea",
          description: "Asigna tarjetas a clientes y monitorea el rendimiento del programa.",
          tips: ["Comienza con tus mejores clientes", "Revisa las métricas regularmente"],
        },
      ],
      tips: ["Los programas de fidelidad aumentan la retención", "Ofrece recompensas atractivas pero sostenibles"],
      relatedPages: ["/dashboard/loyalty-cards"],
      action: {
        type: "navigate",
        target: "/dashboard/loyalty-cards/new",
      },
    },
    {
      id: "setup-templates",
      title: "Crear plantillas de documentos",
      description: "Automatiza la creación de consentimientos y documentos médicos.",
      category: "advanced",
      estimatedTime: "12 min",
      steps: [
        {
          title: "Accede a las plantillas",
          description: "Ve al menú de documentos para crear plantillas personalizadas.",
          tips: ["Las plantillas ahorran tiempo significativo", "Puedes crear diferentes tipos de documentos"],
        },
        {
          title: "Crea la plantilla base",
          description: "Define el contenido base del documento con campos personalizables.",
          tips: ["Incluye todos los campos legales necesarios", "Usa variables para personalizar automáticamente"],
        },
        {
          title: "Configura campos dinámicos",
          description: "Añade campos que se completen automáticamente con datos del cliente.",
          tips: ["Los campos dinámicos reducen errores", "Puedes usar datos del cliente y la cita"],
        },
        {
          title: "Prueba y activa",
          description: "Genera un documento de prueba y activa la plantilla para uso general.",
          tips: ["Siempre prueba antes de usar con clientes", "Puedes modificar plantillas en cualquier momento"],
        },
      ],
      tips: ["Las plantillas ahorran tiempo significativo", "Incluye todos los campos legales necesarios"],
      relatedPages: ["/dashboard/templates"],
      action: {
        type: "navigate",
        target: "/dashboard/templates/new",
      },
    },
    {
      id: "analyze-reports",
      title: "Configurar reportes y análisis",
      description: "Aprende a generar reportes para analizar el rendimiento de tu centro.",
      category: "advanced",
      estimatedTime: "8 min",
      steps: [
        {
          title: "Accede a las estadísticas",
          description: "Ve al menú de facturación y selecciona estadísticas para ver los reportes.",
          tips: ["Los reportes te ayudan a tomar mejores decisiones", "Hay diferentes tipos de análisis disponibles"],
        },
        {
          title: "Explora los reportes disponibles",
          description: "Revisa los diferentes tipos de reportes: ingresos, clientes, servicios más populares.",
          tips: ["Cada reporte ofrece insights únicos", "Puedes combinar diferentes métricas"],
        },
        {
          title: "Configura filtros",
          description: "Ajusta los filtros de fecha, profesional y servicio para obtener datos específicos.",
          tips: ["Los filtros te permiten análisis detallados", "Guarda configuraciones que uses frecuentemente"],
        },
        {
          title: "Programa reportes automáticos",
          description: "Configura reportes que se generen automáticamente y se envíen por email.",
          tips: ["Los reportes automáticos mantienen el control", "Revisa las métricas mensualmente"],
        },
      ],
      tips: ["Los reportes te ayudan a tomar mejores decisiones", "Revisa las métricas mensualmente"],
      relatedPages: ["/dashboard/facturacion/statistics"],
      action: {
        type: "navigate",
        target: "/dashboard/facturacion/statistics",
      },
    },
  ]
  
  export function getTasksByCategory(category: TaskGuide["category"]) {
    return taskGuides.filter((task) => task.category === category)
  }
  
  export function getTaskById(id: string) {
    return taskGuides.find((task) => task.id === id)
  }
  
  export function getAllTasks() {
    return taskGuides
  }
  