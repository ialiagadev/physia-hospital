"use client"

import { useChat } from "ai/react"
import { useState } from "react"
import {
  Search,
  Plus,
  Calendar,
  MessageSquare,
  ChevronDown,
  Paperclip,
  ImageIcon,
  Mic,
  Send,
  Brain,
  Trash2,
} from "lucide-react"
import { useAuth } from "@/app/contexts/auth-context"// Ajusta la ruta según tu estructura

export default function Chat() {
  const { user, userProfile, isLoading: authLoading } = useAuth()
  const [selectedModel, setSelectedModel] = useState("PHYSIA-mini")

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: "/api/chatbot",
    maxSteps: 3,
    body: {
      // Pasar la organización del usuario en el body
      organizationId: userProfile?.organization_id,
      userId: user?.id,
    },
  })

  // Mostrar loading mientras se carga la autenticación
  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Brain size={48} className="mx-auto mb-4 text-purple-600 animate-pulse" />
          <p className="text-gray-600">Cargando...</p>
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
              // Aquí implementarías la lógica de login
              // Por ejemplo, redirigir a /login
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

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Brain size={20} className="text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-gray-900">PHYSIA AI</h1>
              <p className="text-sm text-gray-500">Asistente Médico</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="flex-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg px-4 py-2.5 flex items-center justify-center gap-2 font-medium">
              <Plus size={16} />
              Nueva conversación
            </button>
            <button className="p-2.5 hover:bg-gray-100 rounded-lg">
              <Trash2 size={16} className="text-gray-500" />
            </button>
          </div>
        </div>

        {/* User Info */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
              <span className="text-purple-600 font-medium text-sm">{userProfile.name?.charAt(0).toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{userProfile.name}</p>
              <p className="text-sm text-gray-500 truncate">{userProfile.role}</p>
            </div>
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          </div>
        </div>

        {/* Search */}
        <div className="p-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar conversaciones..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto px-4">
          <div className="mb-4">
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-2">
              <Calendar size={12} />
              HOY
            </h3>
            <div className="bg-purple-50 border border-purple-100 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare size={14} className="text-purple-600" />
                <span className="font-medium text-gray-900">Nueva conversación</span>
              </div>
              <p className="text-sm text-gray-500">0 mensajes</p>
            </div>
          </div>

          <div className="mb-4">
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-2">
              <Calendar size={12} />
              AYER
            </h3>
            <div className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 cursor-pointer">
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare size={14} className="text-gray-600" />
                <span className="font-medium text-gray-900">Nueva conversación</span>
              </div>
              <p className="text-sm text-gray-500">0 mensajes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center relative">
                <span className="text-white font-bold text-sm">P</span>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900">{selectedModel}</span>
                <ChevronDown size={16} className="text-gray-500" />
              </div>
            </div>
            {/* Info del usuario */}
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>Org: {userProfile.organization_id}</span>
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {messages.length === 0 ? (
            /* Welcome Screen */
            <div className="flex-1 flex flex-col items-center justify-center px-6">
              <div className="text-center max-w-2xl">
                {/* Brain Icon with Gradient Background */}
                <div className="relative mb-8">
                  <div className="w-48 h-48 mx-auto rounded-full bg-gradient-to-br from-purple-400 via-purple-500 to-blue-600 flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-300/30 to-transparent"></div>
                    <Brain size={80} className="text-white relative z-10" />
                    <div className="absolute top-8 right-12 w-2 h-2 bg-yellow-300 rounded-full animate-pulse"></div>
                    <div className="absolute bottom-12 left-8 w-1.5 h-1.5 bg-pink-300 rounded-full animate-pulse delay-300"></div>
                  </div>
                </div>

                {/* Model Selector */}
                <div className="mb-8">
                  <div className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-4 py-2 shadow-sm">
                    <span className="font-semibold text-purple-600">PHYSIA-Pro</span>
                    <ChevronDown size={16} className="text-gray-500" />
                  </div>
                </div>

                {/* Title */}
                <h1 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center justify-center gap-2">
                  <span className="text-purple-500">✨</span>
                  Hola {userProfile.name}
                  <span className="text-purple-500">✨</span>
                </h1>

                {/* Description */}
                <p className="text-gray-600 text-lg leading-relaxed mb-12">
                  Potenciado con IA avanzada para ayudarte en la gestión clínica diaria. Puedes interactuar mediante
                  texto, imágenes o audio.
                </p>
              </div>
            </div>
          ) : (
            /* Messages */
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      message.role === "user"
                        ? "bg-purple-600 text-white"
                        : "bg-white border border-gray-200 text-gray-900"
                    }`}
                  >
                    {message.toolInvocations ? (
                      <div className="space-y-2">
                        <div className="whitespace-pre-wrap">{message.content}</div>
                        {message.toolInvocations.map((tool, index) => (
                          <div key={index} className="bg-gray-50 rounded-lg p-3 text-sm">
                            <div className="font-medium text-purple-600">🔧 {tool.toolName}</div>
                            <pre className="mt-1 text-xs overflow-x-auto text-gray-600">
                              {JSON.stringify(tool.args, null, 2)}
                            </pre>
                            {tool.state === "result" && "result" in tool && (
                              <div className="mt-2">
                                <div className="font-medium text-gray-700">Resultado:</div>
                                <pre className="text-xs text-gray-600">{JSON.stringify(tool.result, null, 2)}</pre>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap">{message.content}</div>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 max-w-[80%]">
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
                      <div
                        className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Input Area */}
          <div className="bg-white border-t border-gray-200 p-6">
            <form onSubmit={handleSubmit} className="relative">
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-sm">{userProfile.name?.charAt(0).toUpperCase()}</span>
                </div>

                {/* Input Container */}
                <div className="flex-1 relative">
                  <input
                    className="w-full px-4 py-3 pr-32 border border-gray-200 rounded-2xl bg-gray-50 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent focus:bg-white"
                    value={input}
                    placeholder="Escribe tu mensaje, adjunta una imagen, documento o graba un audio..."
                    onChange={handleInputChange}
                    disabled={isLoading}
                  />

                  {/* Action Buttons */}
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                    <button
                      type="button"
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      disabled={isLoading}
                    >
                      <Paperclip size={16} className="text-gray-500" />
                    </button>
                    <button
                      type="button"
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      disabled={isLoading}
                    >
                      <ImageIcon size={16} className="text-gray-500" />
                    </button>
                    <button
                      type="button"
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      disabled={isLoading}
                    >
                      <Mic size={16} className="text-gray-500" />
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading || !input.trim()}
                      className="p-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                    >
                      <Send size={16} className="text-white" />
                    </button>
                  </div>
                </div>
              </div>
            </form>

            {/* Disclaimer */}
            <p className="text-xs text-gray-500 text-center mt-3">
              PHYSIA AI puede cometer errores. Verifica información importante.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
