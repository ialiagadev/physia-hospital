import { supabase } from "@/lib/supabase/client"

export const debugRealtimeConnection = async () => {
  console.log("🔍 Debugging Realtime Connection...")

  // Verificar el estado de la conexión usando la API correcta
  const realtimeClient = supabase.realtime
  console.log("📡 Realtime Client:", realtimeClient)

  // Verificar configuración
  console.log("🔧 Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL)
  console.log("🔑 Has Anon Key:", !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

  // Test básico de realtime con manejo de errores
  const testChannel = supabase
    .channel("realtime-test")
    .on("broadcast", { event: "test" }, (payload) => {
      console.log("📨 Test broadcast received:", payload)
    })
    .subscribe((status, err) => {
      console.log("🧪 Test channel status:", status)

      if (err) {
        console.error("❌ Test channel error:", err)
        return
      }

      if (status === "SUBSCRIBED") {
        console.log("✅ Test subscription successful")
        // Enviar mensaje de prueba
        testChannel.send({
          type: "broadcast",
          event: "test",
          payload: { message: "Hello from realtime test!" },
        })

        // Limpiar después de 5 segundos
        setTimeout(() => {
          supabase.removeChannel(testChannel)
          console.log("🧹 Test channel cleaned up")
        }, 5000)
      } else if (status === "CHANNEL_ERROR") {
        console.error("🚨 Test channel error status")
      } else if (status === "TIMED_OUT") {
        console.error("⏰ Test channel timed out")
      } else if (status === "CLOSED") {
        console.log("🔒 Test channel closed")
      }
    })
}

export const checkRealtimeSettings = async () => {
  console.log("🔍 Checking Realtime Settings...")

  try {
    // Intentar hacer una consulta simple para verificar permisos
    const { data, error } = await supabase.from("conversations").select("id").limit(1)

    if (error) {
      console.error("❌ Database query error:", error)
      console.log("💡 This might indicate RLS policy issues")
    } else {
      console.log("✅ Database query successful")
    }

    // Verificar si las tablas tienen realtime habilitado
    const { data: realtimeData, error: realtimeError } = await supabase
      .from("pg_publication_tables")
      .select("tablename")
      .in("tablename", ["conversations", "messages", "conversation_tags"])

    if (realtimeError) {
      console.error("❌ Error checking realtime tables:", realtimeError)
      console.log("💡 You might need to enable realtime for these tables")
    } else {
      console.log("📋 Tables with realtime enabled:", realtimeData)

      const expectedTables = ["conversations", "messages", "conversation_tags"]
      const enabledTables = realtimeData?.map((t) => t.tablename) || []
      const missingTables = expectedTables.filter((table) => !enabledTables.includes(table))

      if (missingTables.length > 0) {
        console.warn("⚠️ Missing realtime tables:", missingTables)
        console.log("💡 Run these SQL commands in Supabase SQL Editor:")
        missingTables.forEach((table) => {
          console.log(`ALTER PUBLICATION supabase_realtime ADD TABLE ${table};`)
        })
      }
    }
  } catch (error) {
    console.error("💥 Error checking realtime settings:", error)
  }
}

// Función para monitorear la salud de realtime
export const monitorRealtimeHealth = () => {
  console.log("🏥 Starting Realtime Health Monitor...")

  const healthChannel = supabase.channel("health-monitor").subscribe((status, err) => {
    const timestamp = new Date().toISOString()
    console.log(`🏥 [${timestamp}] Realtime Health:`, status)

    if (err) {
      console.error(`🚨 [${timestamp}] Realtime error:`, err)
    }

    if (status === "CHANNEL_ERROR") {
      console.error("🚨 Realtime channel error detected!")
      // Aquí podrías implementar lógica de reconexión
    } else if (status === "TIMED_OUT") {
      console.error("⏰ Realtime connection timed out!")
    } else if (status === "CLOSED") {
      console.warn("🔒 Realtime connection closed")
    } else if (status === "SUBSCRIBED") {
      console.log("✅ Realtime health monitor active")
    }
  })

  // Cleanup function
  return () => {
    supabase.removeChannel(healthChannel)
    console.log("🧹 Health monitor cleaned up")
  }
}

// Función para probar postgres_changes específicamente
export const testPostgresChanges = (organizationId: number) => {
  console.log("🧪 Testing Postgres Changes for organization:", organizationId)

  const testChannel = supabase
    .channel(`postgres-test-${organizationId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "conversations",
        filter: `organization_id=eq.${organizationId}`,
      },
      (payload) => {
        console.log("📨 Postgres change received:", payload)
      },
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "messages",
      },
      (payload) => {
        console.log("📨 Message change received:", payload)
      },
    )
    .subscribe((status, err) => {
      console.log("🧪 Postgres changes test status:", status)

      if (err) {
        console.error("❌ Postgres changes test error:", err)
      }

      if (status === "SUBSCRIBED") {
        console.log("✅ Postgres changes subscription successful")

        // Cleanup después de 30 segundos
        setTimeout(() => {
          supabase.removeChannel(testChannel)
          console.log("🧹 Postgres changes test cleaned up")
        }, 30000)
      }
    })

  return testChannel
}

// Función para verificar permisos RLS
export const checkRLSPermissions = async (userId: string, organizationId: number) => {
  console.log("🔐 Checking RLS Permissions...")

  try {
    // Test conversations access
    const { data: conversationsData, error: conversationsError } = await supabase
      .from("conversations")
      .select("id, organization_id")
      .eq("organization_id", organizationId)
      .limit(5)

    if (conversationsError) {
      console.error("❌ Conversations RLS error:", conversationsError)
    } else {
      console.log("✅ Conversations RLS check passed:", conversationsData?.length, "records")
    }

    // Test messages access
    const { data: messagesData, error: messagesError } = await supabase
      .from("messages")
      .select("id, conversation_id")
      .limit(5)

    if (messagesError) {
      console.error("❌ Messages RLS error:", messagesError)
    } else {
      console.log("✅ Messages RLS check passed:", messagesData?.length, "records")
    }

    // Test users_conversations access
    const { data: userConvData, error: userConvError } = await supabase
      .from("users_conversations")
      .select("conversation_id, user_id")
      .eq("user_id", userId)
      .limit(5)

    if (userConvError) {
      console.error("❌ Users_conversations RLS error:", userConvError)
    } else {
      console.log("✅ Users_conversations RLS check passed:", userConvData?.length, "records")
    }
  } catch (error) {
    console.error("💥 Error checking RLS permissions:", error)
  }
}
