// Función para sincronizar automáticamente una cita
export async function autoSyncAppointment(appointmentId: string, userId: string, organizationId: number) {
    try {
      console.log("🔄 Iniciando sincronización automática de cita:", appointmentId)
  
      const response = await fetch("/api/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          appointmentId,
          userId,
          organizationId,
        }),
      })
  
      console.log("🔍 Response status:", response.status)
  
      const result = await response.json()
      console.log("🔍 Response result:", result)
  
      if (!response.ok) {
        console.log("❌ Response error:", result)
        throw new Error(`HTTP ${response.status}: ${result.error || "Error desconocido"}`)
      }
  
      if (result.success) {
        console.log("✅ Cita sincronizada automáticamente:", appointmentId)
        return result
      } else {
        console.log("ℹ️ Cita no sincronizada:", result.message)
        // No lanzar error si es solo que no está conectado
        return result
      }
    } catch (error) {
      console.error("❌ Error en sincronización automática:", error)
      // No lanzar error para no interrumpir el flujo principal
      return { success: false, error: error instanceof Error ? error.message : "Error desconocido" }
    }
  }
  
  // Función para sincronizar automáticamente una actividad grupal
  export async function autoSyncGroupActivity(activityId: string, userId: string, organizationId: number) {
    try {
      console.log("🔄 Iniciando sincronización automática de actividad grupal:", activityId)
  
      const response = await fetch("/api/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          activityId,
          userId,
          organizationId,
        }),
      })
  
      console.log("🔍 Response status:", response.status)
  
      const result = await response.json()
      console.log("🔍 Response result:", result)
  
      if (!response.ok) {
        console.log("❌ Response error:", result)
        throw new Error(`HTTP ${response.status}: ${result.error || "Error desconocido"}`)
      }
  
      if (result.success) {
        console.log("✅ Actividad grupal sincronizada automáticamente:", activityId)
        return result
      } else {
        console.log("ℹ️ Actividad grupal no sincronizada:", result.message)
        // No lanzar error si es solo que no está conectado
        return result
      }
    } catch (error) {
      console.error("❌ Error en sincronización automática de actividad grupal:", error)
      // No lanzar error para no interrumpir el flujo principal
      return { success: false, error: error instanceof Error ? error.message : "Error desconocido" }
    }
  }
  