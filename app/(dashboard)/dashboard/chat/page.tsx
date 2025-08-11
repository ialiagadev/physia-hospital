"use client"

import { useState } from "react"
import ChatList from "@/components/chat-list"
import ConversationWindow from "@/components/conversation-window"
import { useAuth } from "@/app/contexts/auth-context"

export default function ChatPage() {
  const { userProfile, isLoading } = useAuth()
  const [selectedChat, setSelectedChat] = useState<string | null>(null)

  // Estado para refrescar ChatList cuando se cambien etiquetas
  const [tagsRefreshKey, setTagsRefreshKey] = useState(0)

  const handleTagsChange = () => {
    // Esto hará que ChatList se vuelva a renderizar y refetchee
    setTagsRefreshKey((prev) => prev + 1)
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p>Cargando...</p>
        </div>
      </div>
    )
  }

  if (!userProfile) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Acceso requerido</h2>
          <p>Necesitas iniciar sesión para acceder al chat.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full bg-gray-100 overflow-hidden m-0 p-0">
      {/* Lista de chats */}
      <div className="w-[25%] min-w-[280px] max-w-[350px] bg-white border-r border-gray-200 flex flex-col">
        {/* Pasamos el key para que se refresque */}
        <ChatList key={tagsRefreshKey} selectedChatId={selectedChat} onChatSelect={setSelectedChat} />
      </div>

      {/* Ventana de conversación */}
      <div className="flex-1 flex flex-col min-w-0 m-0 p-0">
        {selectedChat ? (
          <ConversationWindow
            chatId={selectedChat}
            currentUser={userProfile}
            onTagsChange={handleTagsChange} // 🔹 Le pasamos el callback
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="w-64 h-64 mx-auto mb-8 opacity-20">
                <svg viewBox="0 0 303 172" className="w-full h-full">
                  <path
                    fill="#DDD"
                    d="M229.565 160.229c-6.429-6.429-16.623-6.429-23.052 0l-41.317 41.317-41.317-41.317c-6.429-6.429-16.623-6.429-23.052 0-6.429 6.429-6.429 16.623 0 23.052l52.843 52.843c6.429 6.429 16.623 6.429 23.052 0l52.843-52.843c6.429-6.429 6.429-16.623 0-23.052z"
                  />
                </svg>
              </div>
              <h2 className="text-3xl font-light text-gray-500 mb-4">WhatsApp Business</h2>
              <p className="text-gray-400 max-w-md">
                Selecciona una conversación para comenzar a chatear.
                <br />
                Los mensajes aparecerán aquí en tiempo real.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
