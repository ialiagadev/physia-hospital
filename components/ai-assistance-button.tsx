"use client"
import ChatBot from "@/components/help/ChatBot"

interface AIAssistanceButtonProps {
  conversationId?: string
  clientName?: string
  variant?: "default" | "outline" | "ghost"
  size?: "sm" | "default" | "lg"
  className?: string
  context?: {
    currentTasks?: string[]
    completedTasks?: string[]
    currentPage?: string
  }
}

export function AIAssistanceButton({
  conversationId = "default",
  clientName = "Cliente",
  variant = "default",
  size = "default",
  className = "",
  context = {
    currentPage: `Conversación con ${clientName}`,
    currentTasks: [`Revisando conversación ${conversationId}`],
    completedTasks: [],
  },
}: AIAssistanceButtonProps) {
  return (
    <>
      <ChatBot context={context} />
    </>
  )
}
