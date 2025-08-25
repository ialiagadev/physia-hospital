"use client"

import { useState, useEffect, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { getTaskById } from "@/lib/task-guides"
import type { TaskGuide } from "@/lib/task-guides"
import type { TourStep } from "@/types/tour"

export function useGuidedTour() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [isActive, setIsActive] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [currentGuide, setCurrentGuide] = useState<TaskGuide | null>(null)
  const [tourSteps, setTourSteps] = useState<TourStep[]>([])

  const generateTourSteps = useCallback((guideId: string): TourStep[] => {
    switch (guideId) {
      case "task-management":
        return [
          {
            target: "[data-tour='new-task-btn']",
            title: "Crear nueva tarea",
            description:
              "Este botón te permite crear una nueva tarea para tu equipo. Podrás asignar la tarea a uno o varios profesionales, establecer prioridades, fechas de vencimiento y añadir toda la información necesaria para completar el trabajo.",
            position: "bottom",
          },
          {
            target: "[data-tour='filters-btn']",
            title: "Filtros de tareas",
            description:
              "Los filtros te permiten personalizar la vista de tareas según tus necesidades. Puedes filtrar por estado (creadas, archivadas, eliminadas), por profesional asignado, por prioridad, o buscar tareas específicas por texto.",
            position: "bottom",
          },
          {
            target: "[data-tour='pending-column']",
            title: "Columna 'Por Hacer'",
            description:
              "Esta columna contiene todas las tareas que están pendientes de comenzar. Es el punto de partida del flujo de trabajo. Las tareas nuevas aparecen aquí automáticamente y pueden ser arrastradas a otras columnas cuando se comience a trabajar en ellas.",
            position: "top",
          },
          {
            target: "[data-tour='progress-column']",
            title: "Columna 'En Progreso'",
            description:
              "Aquí se ubican las tareas que están siendo trabajadas actualmente. Esta columna representa el trabajo activo del equipo. Muestra qué tareas están en desarrollo y quién las está realizando.",
            position: "top",
          },
          {
            target: "[data-tour='completed-column']",
            title: "Columna 'Completadas'",
            description:
              "Las tareas finalizadas se mueven a esta columna. Representa el trabajo completado y permite hacer seguimiento de la productividad del equipo. Las tareas completadas mantienen su historial completo para referencia futura.",
            position: "top",
          },
          {
            target: "[data-tour='task-card']",
            title: "Tarjeta de tarea individual",
            description:
              "Cada tarea se representa con una tarjeta que muestra información clave: título, descripción, prioridad, usuarios asignados y fecha de vencimiento. Las tarjetas son interactivas y se pueden arrastrar entre columnas para cambiar su estado.",
            position: "right",
          },
          {
            target: "[data-tour='edit-task-btn']",
            title: "Botones de acción de la tarea",
            description:
              "Cada tarea tiene tres botones de acción: Editar (azul) para modificar la información, Archivar (naranja) para guardar sin eliminar, y Eliminar (rojo) para borrar definitivamente. Estos botones te dan control completo sobre cada tarea.",
            position: "left",
          },
        ]

      case "schedule-appointment":
        return [
          {
            target: "[data-tour='calendar-view']",
            title: "Vista del calendario",
            description: "Este es tu calendario principal. Aquí puedes ver todas las citas programadas y crear nuevas.",
            position: "bottom",
          },
          {
            target: "[data-tour='new-appointment-btn']",
            title: "Crear nueva cita",
            description: "Haz clic en este botón '+' para programar una nueva cita.",
            position: "left",
          },
          {
            target: "[data-tour='appointment-form']",
            title: "Formulario de cita",
            description:
              "Completa los datos de la cita: cliente, servicio, fecha y hora. Si el cliente no existe, puedes crearlo aquí mismo.",
            position: "left",
          },
          {
            target: "[data-tour='client-selector']",
            title: "Seleccionar cliente",
            description:
              "Busca y selecciona el cliente para la cita. Puedes escribir su nombre o teléfono para encontrarlo rápidamente.",
            position: "right",
          },
          {
            target: "[data-tour='service-selector']",
            title: "Seleccionar servicio",
            description: "Elige el servicio que se va a realizar. El precio y duración se completarán automáticamente.",
            position: "right",
          },
          {
            target: "[data-tour='submit-appointment']",
            title: "Confirmar cita",
            description:
              "Una vez completados todos los campos, haz clic aquí para crear la cita. Se enviará una notificación automática al cliente.",
            position: "top",
          },
        ]

      case "manage-clients":
        return [
          {
            target: "[data-tour='new-client-btn']",
            title: "Crear nuevo cliente",
            description:
              "Haz clic en este botón para registrar un nuevo cliente en tu sistema. Podrás introducir toda su información personal, médica y de contacto.",
            position: "left",
          },
          {
            target: "[data-tour='import-clients-btn']",
            title: "Importar clientes desde archivo",
            description:
              "Si ya tienes una base de datos de clientes en Excel o CSV, puedes importarlos masivamente con este botón. Es perfecto para migrar desde otros sistemas.",
            position: "left",
          },
          {
            target: "[data-tour='clients-search-input']",
            title: "Buscador inteligente de clientes",
            description:
              "Utiliza este buscador para encontrar rápidamente cualquier cliente. Puedes buscar por nombre, teléfono, email, NIF o ciudad.",
            position: "bottom",
          },
        ]

      case "time-tracking-system":
        return [
          {
            target: "[data-tour='time-tracking-header']",
            title: "Bienvenido al sistema de control horario",
            description:
              "Este es el centro de control para gestionar todo lo relacionado con el tiempo de trabajo de tu equipo. Desde aquí puedes fichar entrada y salida, ver registros históricos, gestionar solicitudes de vacaciones y generar reportes completos de jornadas laborales.",
            position: "bottom",
          },
          {
            target: "[data-tour='time-tracking-tabs']",
            title: "Pestañas del sistema de fichaje",
            description:
              "El sistema está organizado en cuatro pestañas principales: Fichar (para registrar entrada/salida), Registros (historial de jornadas), Solicitudes (gestión de vacaciones y permisos), y Calendario (vista mensual de solicitudes aprobadas).",
            position: "bottom",
          },
          {
            target: "[data-tour='user-selector']",
            title: "Selector de empleados (solo administradores)",
            description:
              "Como administrador, puedes seleccionar cualquier empleado de tu organización para ver sus registros o fichar en su nombre. Esta funcionalidad es útil para gestionar el tiempo de todo el equipo desde una sola interfaz.",
            position: "right",
          },
          {
            target: "[data-tour='time-clock']",
            title: "Reloj de fichaje principal",
            description:
              "Este es el corazón del sistema de fichaje. Muestra la hora actual, el estado del empleado (dentro/fuera), y los botones para registrar entrada, salida y pausas. El sistema detecta automáticamente si es una entrada o salida según el último registro.",
            position: "left",
          },
          {
            target: "[data-tour='date-filters']",
            title: "Filtros de fechas para registros",
            description:
              "Utiliza estos filtros para buscar registros en períodos específicos. Puedes filtrar por fecha de inicio, fecha de fin, o usar rangos predefinidos como 'última semana' o 'último mes'. Los filtros se aplican automáticamente a la tabla de registros.",
            position: "bottom",
          },
          {
            target: "[data-tour='work-sessions-table']",
            title: "Tabla de registros de jornadas",
            description:
              "Esta tabla muestra el historial completo de jornadas laborales. Incluye fecha, horas de entrada y salida, número de pausas, tiempo total de pausas, tiempo neto trabajado, estado de la jornada y notas adicionales. Los datos se pueden ordenar y exportar.",
            position: "top",
          },
          {
            target: "[data-tour='table-actions']",
            title: "Botones de acción de la tabla",
            description:
              "Estos botones te permiten interactuar con los datos: Exportar genera un archivo CSV con todos los registros filtrados, Actualizar recarga los datos más recientes, y el botón de edición (en cada fila) permite modificar registros específicos.",
            position: "left",
          },
          {
            target: "[data-tour='vacation-requests']",
            title: "Gestión de solicitudes de vacaciones",
            description:
              "En la pestaña de Solicitudes puedes crear nuevas solicitudes de vacaciones, permisos o días libres. También puedes ver el estado de tus solicitudes pendientes y, si eres administrador, aprobar o rechazar solicitudes de tu equipo.",
            position: "center",
          },
          {
            target: "[data-tour='vacation-calendar']",
            title: "Calendario de vacaciones y permisos",
            description:
              "El calendario muestra una vista mensual de todas las solicitudes aprobadas de vacaciones y permisos. Los diferentes tipos de solicitudes se muestran con colores distintos, y puedes navegar entre meses para planificar mejor los recursos del equipo.",
            position: "center",
          },
        ]

      default:
        return []
    }
  }, [])

  useEffect(() => {
    const guideId = searchParams.get("tour")

    if (guideId) {
      const guide = getTaskById(guideId)

      if (guide) {
        if (!currentGuide || currentGuide.id !== guideId) {
          const steps = generateTourSteps(guideId)
          setCurrentGuide(guide)
          setTourSteps(steps)
          setIsActive(true)
          setCurrentStep(0)
        }
      } else {
        const steps = generateTourSteps(guideId)
        if (steps.length > 0) {
          setCurrentGuide({ id: guideId, title: guideId, description: guideId } as TaskGuide)
          setTourSteps(steps)
          setIsActive(true)
          setCurrentStep(0)
        }
      }
    } else {
      if (isActive) {
        setIsActive(false)
        setCurrentStep(0)
        setCurrentGuide(null)
        setTourSteps([])
      }
    }
  }, [searchParams, generateTourSteps])

  const nextStep = useCallback(() => {
    setCurrentStep((prevStep) => {
      if (prevStep < tourSteps.length - 1) {
        return prevStep + 1
      } else {
        // Finalizar tour
        endTour()
        return prevStep
      }
    })
  }, [tourSteps.length])

  const previousStep = useCallback(() => {
    setCurrentStep((prevStep) => {
      if (prevStep > 0) {
        return prevStep - 1
      }
      return prevStep
    })
  }, [])

  const endTour = useCallback(() => {
    setIsActive(false)
    setCurrentStep(0)
    setCurrentGuide(null)
    setTourSteps([])

    // Redirigir a la página de ayuda sin causar bucles
    router.push("/dashboard/help")
  }, [router])

  const skipTour = useCallback(() => {
    endTour()
  }, [endTour])

  return {
    isActive,
    currentStep,
    currentGuide,
    tourSteps,
    currentTourStep: tourSteps[currentStep],
    nextStep,
    previousStep,
    endTour,
    skipTour,
    totalSteps: tourSteps.length,
  }
}
