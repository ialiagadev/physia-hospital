"use client"

import type React from "react"

import { MainSidebar } from "@/components/main-sidebar"
import { BalanceDropdown } from "@/components/balance/balance-dropdown"
import { FeedbackModal } from "@/components/feedback/feedback-modal"
import { Button } from "@/components/ui/button"
import { MessageSquare } from "lucide-react"
import { useState } from "react"

export default function MainDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)

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
    </div>
  )
}
