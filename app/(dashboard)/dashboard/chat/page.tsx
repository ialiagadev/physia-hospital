"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Settings, Tag } from "lucide-react"
import ChatList from "@/components/chat-list"
import ConversationWindow from "@/components/conversation-window"
import { useAuth } from "@/app/contexts/auth-context"
import { Button } from "@/components/ui/button"
import WhatsAppProfileModal from "@/components/whatsapp-profile-modal"
import { useActiveWabas } from "@/hooks/use-active-wabas"

export default function ChatPage() {
  const { userProfile, isLoading } = useAuth()
  const [selectedChat, setSelectedChat] = useState<string | null>(null)
  const router = useRouter()

  // Estado para refrescar ChatList cuando se cambien etiquetas
  const [tagsRefreshKey, setTagsRefreshKey] = useState(0)

  const { hasActiveWabas } = useActiveWabas(userProfile?.organization_id || null)

  const handleTagsChange = () => {
    // Esto hará que ChatList se vuelva a renderizar y refetchee
    setTagsRefreshKey((prev) => prev + 1)
  }

  const handleConfigureNumber = () => {
    router.push("/dashboard/canales/1")
  }

  const handleEtiquetas = () => {
    router.push("/dashboard/etiquetas")
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
        <div className="p-4 border-b border-gray-200">
          <div className="flex gap-2">
            <Button
              onClick={handleConfigureNumber}
              variant="outline"
              size="sm"
              className="flex-1 flex items-center gap-1 bg-transparent border border-purple-500 text-purple-500 hover:bg-purple-50 text-xs"
            >
              <Settings className="h-3 w-3" />
              Número
            </Button>

            {userProfile?.organization_id && hasActiveWabas && (
              <WhatsAppProfileModal
                organizationId={userProfile.organization_id}
                trigger={
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 flex items-center gap-1 bg-transparent border border-blue-500 text-blue-500 hover:bg-blue-50 text-xs"
                  >
                    <Settings className="h-3 w-3" />
                    Perfil
                  </Button>
                }
              />
            )}

            <Button
              onClick={handleEtiquetas}
              variant="outline"
              size="sm"
              className="flex-1 flex items-center gap-1 bg-transparent border border-orange-500 text-orange-500 hover:bg-orange-50 text-xs"
            >
              <Tag className="h-3 w-3" />
              Etiquetas
            </Button>
          </div>
        </div>

        {/* Pasamos el key para que se refresque */}
        <ChatList key={tagsRefreshKey} selectedChatId={selectedChat} onChatSelect={setSelectedChat} />
      </div>

      {/* Ventana de conversación */}
      <div className="flex-1 flex flex-col min-w-0 m-0 p-0">
        {selectedChat ? (
          <ConversationWindow
            chatId={selectedChat}
            currentUser={userProfile}
            onTagsChange={handleTagsChange} // 🔹 Le pasamos el callback para optimizar
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
