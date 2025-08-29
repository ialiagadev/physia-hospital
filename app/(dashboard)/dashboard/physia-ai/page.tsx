"use client"

import { useState } from "react"
import { useChat } from "@ai-sdk/react"
import { MultimodalInput } from "@/components/multimodal-input"
import { ChatSidebar } from "@/components/chat-sidebar"
import { Button } from "@/components/ui/button"
import { PlusCircle, Brain, Sparkles, Calendar, DollarSign, BarChart3, Database, Zap } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useAuth } from "@/app/contexts/auth-context"
import ReactMarkdown from "react-markdown"
import {
  type ChatSession,
  getChatSessions,
  saveChatSession,
  deleteChatSession,
  createNewChatSession,
  generateChatTitle,
} from "@/components/chat-storage"

export default function PhysiaAIPage() {
  const { user, userProfile, isLoading: authLoading } = useAuth()
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const { messages, append, isLoading, setMessages } = useChat({
    api: "/api/chatbot",
    body: {
      model: "gpt-5fast",
      conversationId: currentChatId,
      organizationId: userProfile?.organization_id?.toString() || "",
      userId: user?.id || "",
    },
    onFinish: (message) => {
      saveCurrentConversation()
    },
    onError: (error) => {
      console.error("Chat error:", error)
      toast({
        title: "Error",
        description: "Hubo un problema al procesar tu mensaje",
        variant: "destructive",
      })
    },
  })

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center space-y-6">
          <div className="relative">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-2xl shadow-blue-500/25">
              <Brain size={32} className="text-white animate-pulse" />
            </div>
            <div className="absolute -inset-4 rounded-2xl bg-gradient-to-br from-blue-600/20 via-indigo-600/20 to-purple-600/20 blur-xl animate-pulse"></div>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent">
              PHYSIA AI
            </h1>
            <p className="text-slate-600 font-medium">Iniciando tu asistente inteligente...</p>
          </div>
          <div className="flex items-center justify-center space-x-1">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
            <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
          </div>
        </div>
      </div>
    )
  }

  if (!user || !userProfile) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center space-y-8 max-w-md mx-auto p-8">
          <div className="relative">
            <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-2xl shadow-blue-500/25">
              <Brain size={40} className="text-white" />
            </div>
            <div className="absolute -inset-6 rounded-3xl bg-gradient-to-br from-blue-600/10 via-indigo-600/10 to-purple-600/10 blur-2xl"></div>
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent">
              PHYSIA AI
            </h1>
            <p className="text-lg text-slate-600 leading-relaxed">
              Tu asistente inteligente para la gestión clínica y administrativa
            </p>
          </div>

          <button
            onClick={() => {
              window.location.href = "/login"
            }}
            className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white transition-all duration-200 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl hover:shadow-2xl hover:shadow-blue-500/25 hover:scale-105 active:scale-95"
          >
            <span className="relative z-10">Iniciar Sesión</span>
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-700 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
          </button>
        </div>
      </div>
    )
  }

  const saveCurrentConversation = async () => {
    if (!currentChatId || messages.length === 0) return

    try {
      const chatSession: ChatSession = {
        id: currentChatId,
        title: generateChatTitle(messages[0]?.content || "Nueva consulta"),
        messages: messages.map((m) => ({
          id: m.id,
          role: m.role as "user" | "assistant" | "system",
          content: typeof m.content === "string" ? m.content : "",
        })),
        createdAt: new Date(),
        updatedAt: new Date(),
        agentId: null,
        agentName: null,
      }

      saveChatSession(chatSession)
      setRefreshTrigger((prev) => prev + 1)
    } catch (error) {
      console.error("Error saving conversation:", error)
    }
  }

  const handleNewChat = () => {
    const newSession = createNewChatSession(null, null)
    setCurrentChatId(newSession.id)
    setMessages([])
  }

  const handleChatSelect = (chatId: string) => {
    const sessions = getChatSessions()
    const session = sessions.find((s) => s.id === chatId)
    if (session) {
      setCurrentChatId(session.id)
      setMessages(
        session.messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
        })),
      )
    }
  }

  const handleChatUpdate = (chat: ChatSession) => {
    setRefreshTrigger((prev) => prev + 1)
  }

  const handleDeleteChat = (chatId: string) => {
    deleteChatSession(chatId)
    if (currentChatId === chatId) {
      handleNewChat()
    }
    setRefreshTrigger((prev) => prev + 1)
    toast({
      title: "Conversación eliminada",
      description: "La conversación ha sido eliminada correctamente",
    })
  }

  const handleSend = async (message: string, attachments?: File[]) => {
    if (!message.trim() && (!attachments || attachments.length === 0)) return

    try {
      // Si no hay conversación activa, crear una nueva
      if (!currentChatId) {
        const newSession = createNewChatSession(null, null)
        setCurrentChatId(newSession.id)
      }

      const lowerMessage = message.toLowerCase()
      const isAppointmentQuery =
        lowerMessage.includes("cita") ||
        lowerMessage.includes("agenda") ||
        lowerMessage.includes("calendario") ||
        lowerMessage.includes("paciente") ||
        lowerMessage.includes("mañana") ||
        lowerMessage.includes("hoy") ||
        lowerMessage.includes("consulta")
      const isBillingQuery =
        lowerMessage.includes("factura") || lowerMessage.includes("pago") || lowerMessage.includes("cobro")
      const isKPIQuery =
        lowerMessage.includes("kpi") ||
        lowerMessage.includes("métrica") ||
        lowerMessage.includes("estadística") ||
        lowerMessage.includes("reporte")
      const isDataQuery =
        lowerMessage.includes("datos") || lowerMessage.includes("información") || lowerMessage.includes("consulta")

      const isSpecificQuery = isAppointmentQuery || isBillingQuery || isKPIQuery || isDataQuery

      if (isSpecificQuery) {
        // Add user message to chat
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: "user",
            content: message,
          },
        ])

        // Mostrar mensaje de funcionalidad en desarrollo sin llamar al backend
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              id: (Date.now() + 1).toString(),
              role: "assistant",
              content:
                "🚧 **Funcionalidad en desarrollo**\n\nEsta funcionalidad aún no está disponible. PHYSIA AI podrá consultar y gestionar:\n\n• 📅 **Citas y calendario** - Programar, consultar y modificar citas así como datos de pacientes y clientes\n• 💰 **Facturación y pagos** - Consultar estados de pago y generar facturas\n• 📊 **KPIs y métricas** - Análisis de rendimiento y estadísticas\n• 🗄️ **Datos de la plataforma** - Acceso completo a la información\n\nMientras tanto, puedo ayudarte con otras consultas generales o preguntas sobre el uso de la plataforma.",
            },
          ])
        }, 1000)

        return // Salir sin hacer llamada al backend
      }

      // 📌 Log para depuración
      console.log("📤 Payload al backend:", {
        api: "/api/chatbot",
        organizationId: userProfile?.organization_id?.toString() || "",
        currentChatId,
        model: "gpt-4o",
        message,
        messages: [{ role: "user", content: message }],
      })

      // Verificar que append existe antes de usarlo
      if (typeof append !== "function") {
        throw new Error("La función append no está disponible")
      }

      // Enviar mensaje usando append, pero forzando que vaya `messages` en el body
      await append(
        {
          role: "user",
          content: message,
        },
        {
          body: {
            model: "gpt-4o",
            conversationId: currentChatId,
            organizationId: userProfile?.organization_id?.toString() || "",
            userId: user?.id || "",
            powerupId: "sql-chat",
            messages: [{ role: "user", content: message }],
          },
        },
      )

      // Manejar archivos adjuntos si los hay
      if (attachments && attachments.length > 0) {
        for (const file of attachments) {
          if (file.type.startsWith("image/")) {
            toast({
              title: "Imagen recibida",
              description: `Imagen ${file.name} adjuntada al mensaje`,
            })
          } else if (file.type.startsWith("audio/")) {
            toast({
              title: "Audio recibido",
              description: `Audio ${file.name} recibido para transcripción`,
            })
          }
        }
      }
    } catch (error) {
      console.error("Error sending message:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo enviar el mensaje",
        variant: "destructive",
      })
    }
  }

  const handleQuickStart = async (message: string) => {
    if (!currentChatId) {
      const newSession = createNewChatSession(null, null)
      setCurrentChatId(newSession.id)
    }

    try {
      // Verificar que append existe antes de usarlo
      if (typeof append !== "function") {
        throw new Error("La función append no está disponible")
      }

      await append({
        role: "user",
        content: message,
      })
    } catch (error) {
      console.error("Error sending quick start message:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo enviar el mensaje",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      <div className="w-80 border-r border-slate-200/60 bg-white/70 backdrop-blur-xl">
        <div className="p-6 border-b border-slate-200/60">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="flex items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 p-3 shadow-lg shadow-blue-500/25">
                  <Brain className="h-6 w-6 text-white" />
                </div>
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-blue-600/20 via-indigo-600/20 to-purple-600/20 blur-md"></div>
              </div>
              <div>
                <span className="font-bold text-xl bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent tracking-tight">
                  PHYSIA
                </span>
                <div className="text-xs text-slate-500 font-medium">AI Assistant</div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNewChat}
              className="group flex items-center space-x-2 hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-xl"
            >
              <PlusCircle className="h-4 w-4 group-hover:rotate-90 transition-transform duration-200" />
              <span className="hidden sm:inline font-medium">Nueva</span>
            </Button>
          </div>
        </div>

        <ChatSidebar
          currentChatId={currentChatId}
          onChatSelect={handleChatSelect}
          onNewChat={handleNewChat}
          onChatUpdate={handleChatUpdate}
          refreshTrigger={refreshTrigger}
        />
      </div>

      <div className="flex-1 flex flex-col h-screen">
        {/* Contenido del chat con altura fija y scroll */}
        <div className="flex-1 overflow-y-auto p-6" style={{ height: "calc(100vh - 180px)" }}>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-full max-w-4xl mx-auto text-center space-y-8">
              <div className="relative">
                <div className="flex items-center justify-center w-32 h-32 rounded-full bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 shadow-2xl shadow-blue-500/25">
                  <Brain className="w-16 h-16 text-white" />
                  <Sparkles className="absolute -top-2 -right-2 w-8 h-8 text-yellow-400 animate-pulse" />
                </div>
                <div className="absolute -inset-8 rounded-full bg-gradient-to-br from-blue-600/10 via-indigo-600/10 to-purple-600/10 blur-3xl animate-pulse"></div>
              </div>

              <div className="space-y-4">
                <h1 className="text-5xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent text-balance">
                  ¡Hola! Soy PHYSIA AI
                </h1>
                <p className="text-xl text-slate-600 leading-relaxed max-w-2xl text-pretty">
                  Tu asistente inteligente para la gestión clínica y administrativa
                </p>
              </div>

              <div className="flex items-center gap-3 px-6 py-3 bg-emerald-50 border border-emerald-200 rounded-2xl shadow-sm">
                <div className="relative">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                  <div className="absolute inset-0 w-3 h-3 bg-emerald-500 rounded-full animate-ping opacity-75"></div>
                </div>
                <span className="text-emerald-700 font-semibold">Conectado y listo para ayudarte</span>
                <Zap className="w-4 h-4 text-emerald-600" />
              </div>

              <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 border border-amber-200/60 rounded-3xl p-8 space-y-6 shadow-xl shadow-amber-500/10 max-w-3xl">
                <div className="flex items-center gap-3 text-amber-800">
                  <div className="relative">
                    <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                    <div className="absolute inset-0 w-3 h-3 bg-amber-500 rounded-full animate-ping opacity-75"></div>
                  </div>
                  <span className="font-bold text-lg">Próximamente será capaz de realizar y consultar:</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="group flex items-center gap-4 p-4 bg-white/60 backdrop-blur-sm rounded-2xl border border-white/40 hover:bg-white/80 transition-all duration-200 hover:scale-105">
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-100 group-hover:bg-blue-200 transition-colors duration-200">
                      <Calendar className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800">Gestión de citas</div>
                      <div className="text-sm text-slate-600">y calendario</div>
                    </div>
                  </div>

                  <div className="group flex items-center gap-4 p-4 bg-white/60 backdrop-blur-sm rounded-2xl border border-white/40 hover:bg-white/80 transition-all duration-200 hover:scale-105">
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-100 group-hover:bg-emerald-200 transition-colors duration-200">
                      <DollarSign className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800">Facturación</div>
                      <div className="text-sm text-slate-600">y pagos</div>
                    </div>
                  </div>

                  <div className="group flex items-center gap-4 p-4 bg-white/60 backdrop-blur-sm rounded-2xl border border-white/40 hover:bg-white/80 transition-all duration-200 hover:scale-105">
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-purple-100 group-hover:bg-purple-200 transition-colors duration-200">
                      <BarChart3 className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800">Análisis de KPIs</div>
                      <div className="text-sm text-slate-600">y métricas</div>
                    </div>
                  </div>

                  <div className="group flex items-center gap-4 p-4 bg-white/60 backdrop-blur-sm rounded-2xl border border-white/40 hover:bg-white/80 transition-all duration-200 hover:scale-105">
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-100 group-hover:bg-indigo-200 transition-colors duration-200">
                      <Database className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800">Acceso a datos</div>
                      <div className="text-sm text-slate-600">de la plataforma</div>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-slate-500 max-w-lg text-pretty leading-relaxed">
                Mientras tanto, puedes hacerme cualquier pregunta o solicitar ayuda con tus tareas diarias.
              </p>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-6">
              {messages.map((m, idx) => (
                <div key={m.id || idx} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={[
                      "rounded-3xl px-6 py-4 max-w-[85%] shadow-lg transition-all duration-200 hover:shadow-xl",
                      m.role === "user"
                        ? "bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white shadow-blue-500/25"
                        : "bg-white/80 backdrop-blur-sm border border-slate-200/60 text-slate-800 shadow-lg shadow-slate-500/10",
                    ].join(" ")}
                  >
                    <div className="text-sm leading-relaxed">
                      <div className="prose prose-sm max-w-none prose-slate">
                        <ReactMarkdown>{typeof m.content === "string" ? m.content : ""}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="rounded-3xl px-6 py-4 max-w-[85%] bg-white/80 backdrop-blur-sm border border-slate-200/60 text-slate-800 shadow-lg shadow-slate-500/10">
                    <div className="flex items-center space-x-4">
                      <div className="flex space-x-1">
                        <div className="w-3 h-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full animate-bounce"></div>
                        <div
                          className="w-3 h-3 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full animate-bounce"
                          style={{ animationDelay: "0.1s" }}
                        ></div>
                        <div
                          className="w-3 h-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full animate-bounce"
                          style={{ animationDelay: "0.2s" }}
                        ></div>
                      </div>
                      <span className="text-sm text-slate-600 font-medium">PHYSIA está pensando…</span>
                      <Brain className="w-4 h-4 text-slate-400 animate-pulse" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex-shrink-0 border-t border-slate-200/60 bg-white/70 backdrop-blur-xl p-6">
          <div className="max-w-4xl mx-auto">
            <MultimodalInput onSend={handleSend} disabled={isLoading} placeholder="Escribe tu mensaje a PHYSIA..." />
          </div>
        </div>
      </div>
    </div>
  )
}
