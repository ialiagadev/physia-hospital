export interface ChatMessage {
    id: string
    role: "user" | "assistant" | "system"
    content: string
  }
  
  export interface ChatSession {
    id: string
    title: string
    messages: ChatMessage[]
    createdAt: Date
    updatedAt: Date
    agentId?: string | null
    agentName?: string | null
  }
  
  const STORAGE_KEY = "physia-chat-sessions"
  
  export function getChatSessions(): ChatSession[] {
    if (typeof window === "undefined") return []
  
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) return []
  
      const sessions = JSON.parse(stored)
      return sessions.map((session: any) => ({
        ...session,
        createdAt: new Date(session.createdAt),
        updatedAt: new Date(session.updatedAt),
      }))
    } catch (error) {
      console.error("Error loading chat sessions:", error)
      return []
    }
  }
  
  export function saveChatSession(session: ChatSession): void {
    if (typeof window === "undefined") return
  
    try {
      const sessions = getChatSessions()
      const existingIndex = sessions.findIndex((s) => s.id === session.id)
  
      if (existingIndex >= 0) {
        sessions[existingIndex] = session
      } else {
        sessions.unshift(session)
      }
  
      // Mantener solo las últimas 50 conversaciones
      const limitedSessions = sessions.slice(0, 50)
  
      localStorage.setItem(STORAGE_KEY, JSON.stringify(limitedSessions))
    } catch (error) {
      console.error("Error saving chat session:", error)
    }
  }
  
  export function deleteChatSession(sessionId: string): void {
    if (typeof window === "undefined") return
  
    try {
      const sessions = getChatSessions()
      const filteredSessions = sessions.filter((s) => s.id !== sessionId)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredSessions))
    } catch (error) {
      console.error("Error deleting chat session:", error)
    }
  }
  
  export function generateChatTitle(firstMessage: string): string {
    // Limpiar el mensaje y tomar las primeras palabras
    const cleaned = firstMessage.replace(/[^\w\s]/gi, "").trim()
    const words = cleaned.split(/\s+/).slice(0, 6)
    let title = words.join(" ")
  
    if (title.length > 50) {
      title = title.substring(0, 47) + "..."
    }
  
    return title || "Nueva consulta médica"
  }
  
  export function createNewChatSession(agentId?: string | null, agentName?: string | null): ChatSession {
    return {
      id: `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: agentName ? `Consulta con ${agentName}` : "Nueva consulta médica",
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      agentId,
      agentName,
    }
  }
  