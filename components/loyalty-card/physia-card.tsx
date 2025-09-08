"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Brain, User, Calendar, Clock, Gift, Sparkles, Activity, Zap, DollarSign } from "lucide-react"
import { cn } from "@/lib/utils"
import type { LoyaltyCard } from "@/types/loyalty-cards"

interface PhysiaCardProps {
  card: LoyaltyCard
  customerName: string
  customerID: string
  onAddSession?: (cardId: number) => Promise<void>
  onRedeemReward?: (cardId: number) => Promise<void>
  readOnly?: boolean
}

export function PhysiaCard({
  card,
  customerName,
  customerID,
  onAddSession,
  onRedeemReward,
  readOnly = false,
}: PhysiaCardProps) {
  const [isFlipped, setIsFlipped] = useState(false)
  const [progress, setProgress] = useState(0)
  const [showAnimation, setShowAnimation] = useState(false)

  const isCompleted = card.completed_sessions >= card.total_sessions

  // Actualizar el progreso con animación
  useEffect(() => {
    const timer = setTimeout(() => {
      setProgress((card.completed_sessions / card.total_sessions) * 100)
    }, 100)
    return () => clearTimeout(timer)
  }, [card.completed_sessions, card.total_sessions])

  const flipCard = () => {
    setIsFlipped(!isFlipped)
  }

  const addSession = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (readOnly || !onAddSession) return

    setShowAnimation(true)
    try {
      await onAddSession(card.id)
    } catch (error) {
      console.error("Error adding session:", error)
    } finally {
      setTimeout(() => {
        setShowAnimation(false)
      }, 800)
    }
  }

  const redeemReward = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (readOnly || !onRedeemReward) return

    try {
      await onRedeemReward(card.id)
    } catch (error) {
      console.error("Error redeeming reward:", error)
    }
  }

  // Componente de cerebro personalizado para los sellos
  const BrainIcon = ({ active, isLast }: { active: boolean; isLast: boolean }) => (
    <div className="relative">
      <Brain
        className={cn("h-5 w-5 transition-all duration-300", active ? "text-purple-500" : "text-purple-200")}
        style={{
          filter: active ? "drop-shadow(0 0 2px rgba(138, 79, 255, 0.5))" : "none",
        }}
      />
      {active && (
        <motion.div
          className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-purple-300"
          animate={{ scale: isLast ? [1, 1.5, 1] : 1 }}
          transition={{
            duration: 2,
            repeat: isLast ? Number.POSITIVE_INFINITY : 0,
          }}
        />
      )}
      {active && isLast && (
        <motion.div
          className="absolute inset-0"
          animate={{
            opacity: [0.3, 0.7, 0.3],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 2,
            repeat: Number.POSITIVE_INFINITY,
            repeatType: "loop",
          }}
        >
          <Brain className="h-5 w-5 text-purple-500 opacity-30" />
        </motion.div>
      )}
    </div>
  )

  return (
    <div className="perspective-1000 h-[280px] w-full">
      <motion.div
        className="relative w-full h-full transition-all duration-500 preserve-3d cursor-pointer"
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        initial={{ rotateY: 0 }}
        transition={{ duration: 0.6, type: "spring", stiffness: 70, damping: 15 }}
        onClick={flipCard}
      >
        {/* Frente de la tarjeta */}
        <Card
          className="absolute w-full h-full backface-hidden rounded-xl overflow-hidden border-2"
          style={{
            background: "linear-gradient(135deg, #F3EEFF 0%, #EBE3FF 100%)",
            borderColor: isCompleted ? "#8A4FFF" : "#E9D5FF",
            boxShadow: isCompleted
              ? "0 10px 30px -5px rgba(138, 79, 255, 0.3), 0 0 10px -5px rgba(138, 79, 255, 0.5)"
              : "0 10px 30px -5px rgba(0, 0, 0, 0.1), 0 0 10px -5px rgba(0, 0, 0, 0.04)",
            transform: "rotateY(0deg)",
            WebkitBackfaceVisibility: "hidden",
            backfaceVisibility: "hidden",
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
          }}
        >
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
            <div
              className="absolute top-0 left-0 w-full h-full opacity-5"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%238A4FFF' fillOpacity='1' fillRule='evenodd'/%3E%3C/svg%3E\")",
              }}
            />
          </div>

          <div className="p-5 relative h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center shadow-md">
                  <div className="relative">
                    <Brain className="h-5 w-5 text-white" />
                    <motion.div
                      className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-purple-300"
                      animate={{ scale: [1, 1.5, 1] }}
                      transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                    />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-purple-900">{card.business_name}</h3>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-purple-600">Potenciado por IA</span>
                    <Sparkles className="h-3 w-3 text-purple-500" />
                    {card.service_price && (
                      <>
                        <span className="text-xs text-purple-400 mx-1">•</span>
                        <DollarSign className="h-3 w-3 text-purple-500" />
                        <span className="text-xs text-purple-600">€{card.service_price}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {isCompleted && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 15 }}
                  className="px-2 py-0.5 bg-gradient-to-r from-purple-100 to-purple-200 text-purple-700 text-xs font-medium rounded-full border border-purple-200 shadow-sm"
                >
                  <span className="flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    Completado
                  </span>
                </motion.div>
              )}
            </div>

            <div className="flex items-center gap-2 mb-4 text-purple-900 bg-white/70 backdrop-blur-sm px-3 py-1.5 rounded-md border border-purple-100 text-sm">
              <User className="h-3.5 w-3.5 text-purple-500" />
              <span>{customerName}</span>
              <span className="text-xs text-purple-400 ml-auto">{customerID}</span>
            </div>

            <div className="mb-4">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-purple-600">Progreso</span>
                <span className="font-medium text-purple-900 text-xs">
                  {card.completed_sessions}/{card.total_sessions}
                </span>
              </div>

              <div className="h-2 w-full bg-white/50 relative rounded-full overflow-hidden border border-purple-100">
                <motion.div
                  className="h-full absolute top-0 left-0 rounded-full"
                  style={{
                    background: "linear-gradient(to right, #8A4FFF, #A78BFA)",
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>

              <div className="grid grid-cols-10 gap-1 mt-3">
                {Array.from({ length: card.total_sessions }).map((_, i) => {
                  const isActive = i < card.completed_sessions
                  const isLast = i === card.completed_sessions - 1

                  return (
                    <motion.div
                      key={i}
                      className="relative"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{
                        scale: 1,
                        opacity: 1,
                      }}
                      transition={{
                        delay: i * 0.05,
                        duration: 0.3,
                      }}
                    >
                      <BrainIcon active={isActive} isLast={isLast && isActive} />
                    </motion.div>
                  )
                })}
              </div>
            </div>

            <div className="flex justify-between text-xs text-purple-600 mb-4">
              <div className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-purple-500" />
                <span>
                  Expira: {card.expiry_date ? new Date(card.expiry_date).toLocaleDateString("es-ES") : "Nunca"}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-purple-500" />
                <span>
                  Última:{" "}
                  {card.last_visit_date ? new Date(card.last_visit_date).toLocaleDateString("es-ES") : "Sin visitas"}
                </span>
              </div>
            </div>

            <div className="mt-auto">
              {!readOnly &&
                (isCompleted ? (
                  <Button
                    className="w-full relative overflow-hidden group shadow-md h-9 text-sm border-0"
                    style={{
                      background: "linear-gradient(to right, #8A4FFF, #6236CB)",
                      color: "#fff",
                    }}
                    onClick={redeemReward}
                  >
                    <span className="relative z-10 flex items-center font-semibold">
                      <Gift className="mr-2 h-4 w-4" />
                      Canjear recompensa
                    </span>
                    <span
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      style={{
                        background: "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)",
                        transform: "skewX(-45deg)",
                        animation: "shine 1.5s infinite",
                      }}
                    />
                  </Button>
                ) : (
                  <Button
                    className="w-full relative overflow-hidden group shadow-md h-9 text-sm border-0"
                    style={{
                      background: "linear-gradient(to right, #8A4FFF, #6236CB)",
                      color: "#fff",
                    }}
                    onClick={addSession}
                    disabled={showAnimation}
                  >
                    <span className="relative z-10 flex items-center font-semibold">
                      <Activity className="mr-2 h-4 w-4" />
                      {showAnimation ? "Registrando..." : "Registrar sesión"}
                    </span>
                    <span
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      style={{
                        background: "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)",
                        transform: "skewX(-45deg)",
                        animation: "shine 1.5s infinite",
                      }}
                    />
                  </Button>
                ))}
            </div>
          </div>

          <AnimatePresence>
            {showAnimation && (
              <motion.div
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1.5, opacity: 1 }}
                exit={{ scale: 2, opacity: 0 }}
                transition={{ duration: 0.8 }}
              >
                <Brain className="w-16 h-16 text-purple-500" />
              </motion.div>
            )}
          </AnimatePresence>
        </Card>

        {/* Reverso de la tarjeta */}
        <Card
          className="absolute w-full h-full backface-hidden rounded-xl overflow-hidden border-2"
          style={{
            background: "linear-gradient(135deg, #8A4FFF 0%, #6236CB 100%)",
            borderColor: isCompleted ? "#A78BFA" : "#8A4FFF",
            boxShadow: isCompleted
              ? "0 10px 30px -5px rgba(138, 79, 255, 0.3), 0 0 10px -5px rgba(138, 79, 255, 0.5)"
              : "0 10px 30px -5px rgba(0, 0, 0, 0.1), 0 0 10px -5px rgba(0, 0, 0, 0.04)",
            transform: "rotateY(180deg)",
            WebkitBackfaceVisibility: "hidden",
            backfaceVisibility: "hidden",
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
          }}
        >
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
            <div
              className="absolute top-0 left-0 w-full h-full opacity-10"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%23ffffff' fillOpacity='1' fillRule='evenodd'/%3E%3C/svg%3E\")",
              }}
            />
          </div>

          <div className="p-5 flex flex-col h-full relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-md">
                <div className="relative">
                  <Brain className="h-5 w-5 text-white" />
                  <motion.div
                    className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-purple-300"
                    animate={{ scale: [1, 1.5, 1] }}
                    transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                  />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{card.business_name}</h3>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-purple-200">Potenciado por IA</span>
                  <Sparkles className="h-3 w-3 text-purple-200" />
                  {card.service_price && (
                    <>
                      <span className="text-xs text-purple-300 mx-1">•</span>
                      <DollarSign className="h-3 w-3 text-purple-200" />
                      <span className="text-xs text-purple-200">€{card.service_price}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-grow flex flex-col items-center justify-center text-center">
              <motion.div
                className="relative mb-4"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 10, delay: 0.2 }}
              >
                <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center relative">
                  <div className="absolute inset-0 rounded-full overflow-hidden">
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-transparent"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 10, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                    />
                  </div>

                  <div className="relative z-10">
                    {isCompleted ? (
                      <Gift className="h-10 w-10 text-white" />
                    ) : (
                      <Brain className="h-10 w-10 text-white" />
                    )}
                  </div>
                </div>

                {isCompleted && (
                  <motion.div
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white shadow-md flex items-center justify-center"
                    initial={{ scale: 0, rotate: -30 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 10, delay: 0.4 }}
                  >
                    <Sparkles className="h-4 w-4 text-purple-500" />
                  </motion.div>
                )}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                {isCompleted ? (
                  <div>
                    <p className="text-white mb-1 font-bold text-sm">¡Felicidades!</p>
                    <p className="text-purple-200 mb-2 text-xs">Has completado todas tus sesiones y has ganado:</p>
                    <p className="font-medium text-white text-sm">{card.reward}</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-white mb-2 text-sm">
                      Te faltan <strong>{card.total_sessions - card.completed_sessions} sesiones</strong> para
                      conseguir:
                    </p>
                    <p className="font-medium text-purple-200 text-sm">{card.reward}</p>
                  </div>
                )}
              </motion.div>
            </div>

            <div className="mt-auto">
              {!readOnly &&
                (isCompleted ? (
                  <Button
                    className="w-full relative overflow-hidden group shadow-md h-9 text-sm"
                    style={{
                      background: "rgba(255, 255, 255, 0.2)",
                      backdropFilter: "blur(4px)",
                      border: "1px solid rgba(255, 255, 255, 0.3)",
                      color: "#fff",
                    }}
                    onClick={redeemReward}
                  >
                    <span className="relative z-10 flex items-center font-semibold">
                      <Gift className="mr-2 h-4 w-4" />
                      Canjear recompensa
                    </span>
                    <span
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      style={{
                        background: "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)",
                        transform: "skewX(-45deg)",
                        animation: "shine 1.5s infinite",
                      }}
                    />
                  </Button>
                ) : (
                  <Button
                    className="w-full relative overflow-hidden group shadow-md h-9 text-sm"
                    style={{
                      background: "rgba(255, 255, 255, 0.2)",
                      backdropFilter: "blur(4px)",
                      border: "1px solid rgba(255, 255, 255, 0.3)",
                      color: "#fff",
                    }}
                    onClick={addSession}
                    disabled={showAnimation}
                  >
                    <span className="relative z-10 flex items-center font-semibold">
                      <Activity className="mr-2 h-4 w-4" />
                      {showAnimation ? "Registrando..." : "Registrar sesión"}
                    </span>
                    <span
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      style={{
                        background: "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)",
                        transform: "skewX(-45deg)",
                        animation: "shine 1.5s infinite",
                      }}
                    />
                  </Button>
                ))}
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  )
}
