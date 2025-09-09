"use client"

import type React from "react"

import { MainSidebar } from "@/components/main-sidebar"
import { BalanceDropdown } from "@/components/balance/balance-dropdown"
import { FeedbackModal } from "@/components/feedback/feedback-modal"
import ChatInterface from "@/components/help/chat-interface"
import { Button } from "@/components/ui/button"
import { MessageSquare, Bot } from "lucide-react"
import { useState } from "react"

export default function MainDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [showChatBot, setShowChatBot] = useState(false)

  return (
    <div className="flex h-screen">
      {/* Sidebar principal */}
      <div className="hidden md:block">
        <MainSidebar />
      </div>

      {/* Contenido principal */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <header className="border-b bg-background flex justify-end items-center px-6 py-3">
          <div className="flex items-center gap-3">
            {/* Botón de Asistencia AI antes del botón de Feedback */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowChatBot(true)}
              className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm hover:bg-gray-50 text-gray-700 hover:text-blue-600"
            >
              <Bot className="h-4 w-4 mr-2" />
              Asistencia AI
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFeedbackModal(true)}
              className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm hover:bg-gray-50 text-gray-700 hover:text-blue-600"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Feedback
            </Button>

            {/* Balance a la derecha */}
            <BalanceDropdown />
          </div>
        </header>

        {/* Contenido de la página */}
        <main className="flex-1 overflow-auto py-6 px-0">{children}</main>
      </div>

      {/* FeedbackModal component */}
      <FeedbackModal isOpen={showFeedbackModal} onClose={() => setShowFeedbackModal(false)} />

      {/* ChatInterface component that is shown conditionally */}
      {showChatBot && (
        <div className="fixed inset-0 z-50">
          {/* Overlay to close the chat */}
          <div className="absolute inset-0 bg-black/20" onClick={() => setShowChatBot(false)} />
          {/* ChatInterface positioned in the bottom right corner */}
          <div className="absolute bottom-6 right-6">
            <ChatInterface onClose={() => setShowChatBot(false)} />
          </div>
        </div>
      )}
    </div>
  )
}
