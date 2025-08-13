"use client"

import { useState } from "react"
import { useChat } from "@ai-sdk/react"
import { MultimodalInput } from "@/components/multimodal-input"
import { ChatSidebar } from "@/components/chat-sidebar"
import { ModelSelector } from "@/components/model-selector"
import AgentSelector from "@/components/agent-selector"
import { JarvisWelcome } from "@/components/jarvis-welcome"
import { Button } from "@/components/ui/button"
import { PlusCircle, Brain } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useAuth } from "@/app/contexts/auth-context"
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
  const [selectedModel, setSelectedModel] = useState("gpt-4o")
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const [selectedAgentName, setSelectedAgentName] = useState<string | null>(null)
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const { messages, append, isLoading, setMessages } = useChat({
    api: selectedAgent ? `/api/agents/${selectedAgent}/powerups/chat` : "/api/chatbot",
    body: {
      model: selectedModel,
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

  // Mostrar loading mientras se carga la autenticación
  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Brain size={48} className="mx-auto mb-4 text-purple-600 animate-pulse" />
          <p className="text-gray-600">Cargando PHYSIA AI...</p>
        </div>
      </div>
    )
  }

  // Mostrar login si no está autenticado
  if (!user || !userProfile) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Brain size={48} className="mx-auto mb-4 text-purple-600" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">PHYSIA AI</h1>
          <p className="text-gray-600 mb-4">Necesitas iniciar sesión para continuar</p>
          <button
            onClick={() => {
              window.location.href = "/login"
            }}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg"
          >
            Iniciar Sesión
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
        agentId: selectedAgent,
        agentName: selectedAgentName,
      }

      saveChatSession(chatSession)
      setRefreshTrigger((prev) => prev + 1)
    } catch (error) {
      console.error("Error saving conversation:", error)
    }
  }

  const handleNewChat = () => {
    const newSession = createNewChatSession(selectedAgent, selectedAgentName)
    setCurrentChatId(newSession.id)
    setMessages([])
    setSelectedAgent(null)
    setSelectedAgentName(null)
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
      setSelectedAgent(session.agentId || null)
      setSelectedAgentName(session.agentName || null)
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

  const handleAgentChange = (agentId: string | null, agentName: string | null) => {
    setSelectedAgent(agentId)
    setSelectedAgentName(agentName)
  }
  const handleSend = async (message: string, attachments?: File[]) => {
    if (!message.trim() && (!attachments || attachments.length === 0)) return;
  
    try {
      // Si no hay conversación activa, crear una nueva
      if (!currentChatId) {
        const newSession = createNewChatSession(selectedAgent, selectedAgentName);
        setCurrentChatId(newSession.id);
      }
  
      // 📌 Log para depuración
      console.log("📤 Payload al backend:", {
        api: selectedAgent ? `/api/agents/${selectedAgent}/powerups/chat` : "/api/chatbot",
        organizationId: userProfile?.organization_id?.toString() || "",
        currentChatId,
        selectedModel,
        selectedAgent,
        message,
        messages: [
          { role: "user", content: message }
        ]
      });
  
      // Verificar que append existe antes de usarlo
      if (typeof append !== "function") {
        throw new Error("La función append no está disponible");
      }
  
      // Enviar mensaje usando append, pero forzando que vaya `messages` en el body
      await append(
        {
          role: "user",
          content: message,
        },
        {
          body: {
            model: selectedModel,
            conversationId: currentChatId,
            organizationId: userProfile?.organization_id?.toString() || "",
            userId: user?.id || "",
            powerupId: "sql-chat", // o el que corresponda
            messages: [
              { role: "user", content: message }
            ],
          },
        }
      );
  
      // Manejar archivos adjuntos si los hay
      if (attachments && attachments.length > 0) {
        for (const file of attachments) {
          if (file.type.startsWith("image/")) {
            toast({
              title: "Imagen recibida",
              description: `Imagen ${file.name} adjuntada al mensaje`,
            });
          } else if (file.type.startsWith("audio/")) {
            toast({
              title: "Audio recibido",
              description: `Audio ${file.name} recibido para transcripción`,
            });
          }
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo enviar el mensaje",
        variant: "destructive",
      });
    }
  };
  
  


  const handleQuickStart = async (message: string) => {
    if (!currentChatId) {
      const newSession = createNewChatSession(selectedAgent, selectedAgentName)
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
    <div className="flex h-[calc(100vh-4rem)] bg-background">
      {/* Sidebar de conversaciones */}
      <div className="w-80 border-r bg-muted/30">
        <ChatSidebar
          currentChatId={currentChatId}
          onChatSelect={handleChatSelect}
          onNewChat={handleNewChat}
          onChatUpdate={handleChatUpdate}
          refreshTrigger={refreshTrigger}
        />
      </div>

      {/* Área principal del chat */}
      <div className="flex-1 flex flex-col">
        {/* Header del chat */}
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center justify-between p-4">
            {/* Lado izquierdo - PHYSIA y selector de modelos */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="flex items-center justify-center rounded-md bg-primary/10 p-2">
                  <span className="font-bold text-primary text-lg tracking-tight">PHYSIA</span>
                </div>
                <div className="h-6 w-px bg-border/50" />
                <ModelSelector selectedModel={selectedModel} onModelChange={setSelectedModel} />
              </div>
            </div>

            {/* Centro - Info del usuario */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>{userProfile.name}</span>
                <span className="text-xs">({userProfile.role})</span>
              </div>
            </div>

            {/* Lado derecho - Selector de agentes */}
            <div className="flex items-center space-x-2">
              <AgentSelector
                selectedAgentId={selectedAgent}
                onAgentChange={handleAgentChange}
                organizationId={userProfile.organization_id?.toString() || ""}
              />
              <Button variant="ghost" size="sm" onClick={handleNewChat} className="flex items-center space-x-2">
                <PlusCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Nueva</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Contenido del chat */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-4">
            {messages.length === 0 ? (
              <JarvisWelcome onQuickStart={handleQuickStart} />
            ) : (
              <div className="max-w-3xl mx-auto space-y-4">
                {messages.map((m, idx) => (
                  <div key={m.id || idx} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={[
                        "rounded-2xl px-4 py-3 max-w-[80%] shadow-sm",
                        m.role === "user" ? "bg-primary text-primary-foreground" : "bg-white border text-foreground",
                      ].join(" ")}
                    >
                      <div className="whitespace-pre-wrap break-words text-sm">
                        {typeof m.content === "string" ? m.content : ""}
                      </div>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl px-4 py-3 max-w-[80%] bg-white border text-foreground shadow-sm">
                      <div className="flex items-center space-x-2">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                          <div
                            className="w-2 h-2 bg-primary rounded-full animate-bounce"
                            style={{ animationDelay: "0.1s" }}
                          ></div>
                          <div
                            className="w-2 h-2 bg-primary rounded-full animate-bounce"
                            style={{ animationDelay: "0.2s" }}
                          ></div>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {selectedAgentName ? `${selectedAgentName} está pensando…` : "PHYSIA está pensando…"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4">
            <div className="max-w-3xl mx-auto">
              <MultimodalInput
                onSend={handleSend}
                disabled={isLoading}
                placeholder={
                  selectedAgentName ? `Escribe tu mensaje a ${selectedAgentName}...` : "Escribe tu mensaje a PHYSIA..."
                }
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
