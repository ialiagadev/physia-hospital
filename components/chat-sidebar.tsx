"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { MessageSquare, Plus, Trash2, Brain, Bot, MoreHorizontal, Edit3 } from "lucide-react"
import { cn } from "@/lib/utils"
import { type ChatSession, getChatSessions, deleteChatSession, saveChatSession } from "@/components/chat-storage"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"

interface ChatSidebarProps {
  currentChatId: string | null
  onChatSelect: (chatId: string) => void
  onNewChat: () => void
  onChatUpdate: (chat: ChatSession) => void
  refreshTrigger: number
}

export function ChatSidebar({
  currentChatId,
  onChatSelect,
  onNewChat,
  onChatUpdate,
  refreshTrigger,
}: ChatSidebarProps) {
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")

  useEffect(() => {
    loadChatSessions()
  }, [refreshTrigger])

  const loadChatSessions = () => {
    const sessions = getChatSessions()
    setChatSessions(sessions)
  }

  const handleDeleteChat = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    deleteChatSession(chatId)
    loadChatSessions()

    if (currentChatId === chatId) {
      onNewChat()
    }
  }

  const handleEditStart = (chat: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingId(chat.id)
    setEditTitle(chat.title)
  }

  const handleEditSave = (chat: ChatSession) => {
    if (editTitle.trim()) {
      const updatedChat = { ...chat, title: editTitle.trim(), updatedAt: new Date() }
      saveChatSession(updatedChat)
      onChatUpdate(updatedChat)
      loadChatSessions()
    }
    setEditingId(null)
    setEditTitle("")
  }

  const handleEditCancel = () => {
    setEditingId(null)
    setEditTitle("")
  }

  const formatDate = (date: Date) => {
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return date.toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
      })
    } else if (diffInHours < 168) {
      // 7 días
      return date.toLocaleDateString("es-ES", {
        weekday: "short",
      })
    } else {
      return date.toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
      })
    }
  }

  return (
    <div className="w-80 border-r bg-white/50 backdrop-blur-sm flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <Button
          onClick={onNewChat}
          className="w-full justify-start gap-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
        >
          <Plus className="h-4 w-4" />
          Nueva Conversación
        </Button>
      </div>

      {/* Chat List */}
      <ScrollArea className="flex-1 p-2">
        <div className="space-y-1">
          {chatSessions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No hay conversaciones</p>
              <p className="text-xs">Inicia una nueva conversación</p>
            </div>
          ) : (
            chatSessions.map((chat) => (
              <div
                key={chat.id}
                className={cn(
                  "group relative rounded-lg p-3 cursor-pointer transition-all duration-200 hover:bg-purple-50 border border-transparent",
                  currentChatId === chat.id && "bg-purple-100 border-purple-200 shadow-sm",
                )}
                onClick={() => onChatSelect(chat.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <div className="flex-shrink-0 mt-0.5">
                      {chat.agentId ? (
                        <Bot className="h-4 w-4 text-blue-600" />
                      ) : (
                        <Brain className="h-4 w-4 text-purple-600" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      {editingId === chat.id ? (
                        <Input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onBlur={() => handleEditSave(chat)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleEditSave(chat)
                            if (e.key === "Escape") handleEditCancel()
                          }}
                          className="h-6 text-sm p-1"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <h3 className="font-medium text-sm text-gray-900 truncate leading-tight">{chat.title}</h3>
                      )}

                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500">{formatDate(chat.updatedAt)}</span>
                        {chat.agentName && (
                          <Badge
                            variant="secondary"
                            className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 border-blue-200"
                          >
                            {chat.agentName}
                          </Badge>
                        )}
                      </div>

                      {chat.messages.length > 0 && (
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                          {chat.messages[chat.messages.length - 1]?.content.substring(0, 60)}...
                        </p>
                      )}
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 hover:bg-gray-200"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem onClick={(e) => handleEditStart(chat, e)} className="text-sm">
                        <Edit3 className="h-3 w-3 mr-2" />
                        Renombrar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => handleDeleteChat(chat.id, e)}
                        className="text-sm text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-3 w-3 mr-2" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t bg-gray-50/50">
        <div className="text-xs text-gray-500 text-center">
          {chatSessions.length} conversación{chatSessions.length !== 1 ? "es" : ""}
        </div>
      </div>
    </div>
  )
}
