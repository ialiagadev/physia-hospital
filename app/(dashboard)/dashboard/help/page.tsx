"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Checkbox } from "@/components/ui/checkbox"
import {
  BookOpen,
  CheckCircle2,
  Clock,
  MessageCircle,
  Mail,
  Phone,
  Target,
  Sparkles,
  ArrowRight,
  Play,
  Star,
  Award,
  Zap,
  HelpCircle,
  Navigation,
  Route,
} from "lucide-react"
import { TaskGuideModal } from "@/components/task-guide-modal"
import { taskGuides, type TaskGuide, type GuideStep } from "@/lib/task-guides"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { AlertTriangle } from "lucide-react"
import SelfOnboardingTour from "@/components/help/SelfOnboardingTour"
import ChatBot from "@/components/help/ChatBot"

export default function HelpPage() {
  const [completedTasks, setCompletedTasks] = useState<string[]>([])
  const [selectedTask, setSelectedTask] = useState<TaskGuide | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteError, setInviteError] = useState("")
  const [inviteResult, setInviteResult] = useState<any>(null)
  const [userForm, setUserForm] = useState({
    email: "",
    name: "",
    role: "user" as "user" | "admin" | "coordinador",
  })

  // New state for self-onboarding tour
  const [onboardingSteps, setOnboardingSteps] = useState<GuideStep[] | null>(null)
  const [showOnboardingTour, setShowOnboardingTour] = useState(false)

  const router = useRouter()

  // Cargar tareas completadas del localStorage
  useEffect(() => {
    const saved = localStorage.getItem("completed-tasks")
    if (saved) {
      setCompletedTasks(JSON.parse(saved))
    }
  }, [])

  // Guardar tareas completadas en localStorage
  const saveCompletedTasks = (tasks: string[]) => {
    localStorage.setItem("completed-tasks", JSON.stringify(tasks))
    setCompletedTasks(tasks)
  }

  const toggleTaskCompletion = (taskId: string) => {
    const newCompleted = completedTasks.includes(taskId)
      ? completedTasks.filter((id) => id !== taskId)
      : [...completedTasks, taskId]

    saveCompletedTasks(newCompleted)
  }

  const handleTaskClick = (task: TaskGuide) => {
    // Check if task has interactive tour - now use SelfOnboardingTour instead of just navigating
    if (task.action?.type === "interactive-tour" && task.steps) {
      setOnboardingSteps(task.steps)
      setShowOnboardingTour(true)
      return
    }

    // Check if task has self-onboarding steps (for modal tour)
    if (task.selfOnboarding && task.steps && task.action?.type !== "interactive-tour") {
      setOnboardingSteps(task.steps)
      setShowOnboardingTour(true)
      return
    }

    // Original behavior for other tasks
    if (task.action) {
      switch (task.action.type) {
        case "navigate":
          router.push(task.action.target)
          break
        case "modal":
          if (task.action.target === "invite-professional") {
            setShowInviteModal(true)
          }
          break
        case "external":
          window.open(task.action.target, "_blank")
          break
        default:
          setSelectedTask(task)
          setShowModal(true)
      }
    } else {
      setSelectedTask(task)
      setShowModal(true)
    }
  }

  // Función para crear usuario (invitar profesional)
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviteLoading(true)
    setInviteError("")
    setInviteResult(null)

    try {
      const response = await fetch("/api/create-user-simple", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: userForm.email,
          name: userForm.name,
          role: userForm.role,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error creando usuario")
      }

      setInviteResult(data)
      setUserForm({ email: "", name: "", role: "user" })

      // Marcar la tarea como completada
      if (!completedTasks.includes("add-professional")) {
        saveCompletedTasks([...completedTasks, "add-professional"])
      }
    } catch (err: any) {
      setInviteError(err.message)
    } finally {
      setInviteLoading(false)
    }
  }

  const resetInviteModal = () => {
    setInviteError("")
    setInviteResult(null)
    setUserForm({ email: "", name: "", role: "user" })
  }

  // Calcular estadísticas
  const essentialTasks = taskGuides.filter((task) => task.category === "essential")
  const recommendedTasks = taskGuides.filter((task) => task.category === "recommended")
  const advancedTasks = taskGuides.filter((task) => task.category === "advanced")

  const essentialCompleted = essentialTasks.filter((task) => completedTasks.includes(task.id)).length
  const recommendedCompleted = recommendedTasks.filter((task) => completedTasks.includes(task.id)).length
  const advancedCompleted = advancedTasks.filter((task) => completedTasks.includes(task.id)).length

  const totalTasks = taskGuides.length
  const totalCompleted = completedTasks.length
  const overallProgress = (totalCompleted / totalTasks) * 100

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "essential":
        return <Zap className="w-4 h-4 text-red-600" />
      case "recommended":
        return <Target className="w-4 h-4 text-yellow-600" />
      case "advanced":
        return <Star className="w-4 h-4 text-blue-600" />
      default:
        return <BookOpen className="w-4 h-4" />
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "essential":
        return "border-l-red-500 bg-red-50/30"
      case "recommended":
        return "border-l-yellow-500 bg-yellow-50/30"
      case "advanced":
        return "border-l-blue-500 bg-blue-50/30"
      default:
        return "border-l-gray-500 bg-gray-50/30"
    }
  }

  const getTaskActionIcon = (task: TaskGuide) => {
    if (task.action?.type === "interactive-tour") {
      return <Route className="w-3 h-3" />
    }

    if (task.selfOnboarding) {
      return <Navigation className="w-3 h-3" />
    }

    switch (task.action?.type) {
      case "navigate":
        return <ArrowRight className="w-3 h-3" />
      case "modal":
        return <Play className="w-3 h-3" />
      case "external":
        return <ArrowRight className="w-3 h-3" />
      default:
        return <BookOpen className="w-3 h-3" />
    }
  }

  const getTaskActionText = (task: TaskGuide) => {
    if (task.action?.type === "interactive-tour") {
      return "Comenzar tour"
    }

    if (task.selfOnboarding) {
      return "Ver guía"
    }

    switch (task.action?.type) {
      case "navigate":
        return "Ir"
      case "modal":
        return "Abrir"
      case "external":
        return "Ver"
      default:
        return "Ver guía"
    }
  }

  const getTaskBadge = (task: TaskGuide) => {
    if (task.action?.type === "interactive-tour") {
      return (
        <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
          Tour interactivo
        </Badge>
      )
    }

    if (task.selfOnboarding) {
      return (
        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
          Guía paso a paso
        </Badge>
      )
    }

    return null
  }

  const TaskItem = ({ task, isCompleted }: { task: TaskGuide; isCompleted: boolean }) => (
    <div
      className={`group flex items-center gap-3 p-4 border-l-4 rounded-lg transition-all duration-200 hover:shadow-md cursor-pointer ${
        isCompleted
          ? "border-l-green-500 bg-green-50/50 hover:bg-green-50"
          : getCategoryColor(task.category) + " hover:shadow-lg"
      }`}
      onClick={() => handleTaskClick(task)}
    >
      {/* Checkbox */}
      <Checkbox
        checked={isCompleted}
        onCheckedChange={() => toggleTaskCompletion(task.id)}
        className={`transition-all duration-200 ${
          isCompleted ? "data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500" : ""
        }`}
        onClick={(e) => e.stopPropagation()}
      />

      {/* Category Icon */}
      <div className="flex-shrink-0">{getCategoryIcon(task.category)}</div>

      {/* Task Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <h3
            className={`font-medium text-sm ${isCompleted ? "text-green-700 line-through" : "text-gray-900"} truncate`}
          >
            {task.title}
          </h3>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Clock className="w-3 h-3" />
            <span>{task.estimatedTime}</span>
          </div>
          {getTaskBadge(task)}
        </div>
        <p className={`text-xs ${isCompleted ? "text-green-600" : "text-gray-600"} line-clamp-1`}>{task.description}</p>
      </div>

      {/* Action Button */}
      <Button
        variant="ghost"
        size="sm"
        className="opacity-0 group-hover:opacity-100 transition-opacity text-xs px-2 py-1 h-auto"
        onClick={(e) => {
          e.stopPropagation()
          handleTaskClick(task)
        }}
      >
        {getTaskActionIcon(task)}
        <span className="ml-1 hidden sm:inline">{getTaskActionText(task)}</span>
      </Button>

      {/* Completed Badge */}
      {isCompleted && <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />}
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Centro de Ayuda</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Completa estas tareas para configurar tu centro médico y aprovechar al máximo Physia.
          </p>
        </div>
      </div>

      {/* Progress Card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Progreso General</CardTitle>
              <CardDescription>
                {totalCompleted} de {totalTasks} tareas completadas
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">{Math.round(overallProgress)}%</div>
              {overallProgress === 100 && (
                <Badge className="bg-green-100 text-green-800 border-green-200">
                  <Award className="w-3 h-3 mr-1" />
                  ¡Completado!
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={overallProgress} className="h-2 mb-4" />
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-semibold text-red-600">
                {essentialCompleted}/{essentialTasks.length}
              </div>
              <div className="text-xs text-gray-600">Esenciales</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-yellow-600">
                {recommendedCompleted}/{recommendedTasks.length}
              </div>
              <div className="text-xs text-gray-600">Recomendadas</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-blue-600">
                {advancedCompleted}/{advancedTasks.length}
              </div>
              <div className="text-xs text-gray-600">Avanzadas</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Task Lists */}
      <div className="space-y-6">
        {/* Essential Tasks */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-2">
            <Zap className="w-5 h-5 text-red-600" />
            <h2 className="text-lg font-semibold text-gray-900">Tareas Esenciales</h2>
            <Badge variant="outline" className="text-xs">
              {essentialCompleted}/{essentialTasks.length}
            </Badge>
          </div>
          <div className="space-y-2">
            {essentialTasks.map((task) => (
              <TaskItem key={task.id} task={task} isCompleted={completedTasks.includes(task.id)} />
            ))}
          </div>
        </div>

        {/* Recommended Tasks */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-2">
            <Target className="w-5 h-5 text-yellow-600" />
            <h2 className="text-lg font-semibold text-gray-900">Tareas Recomendadas</h2>
            <Badge variant="outline" className="text-xs">
              {recommendedCompleted}/{recommendedTasks.length}
            </Badge>
          </div>
          <div className="space-y-2">
            {recommendedTasks.map((task) => (
              <TaskItem key={task.id} task={task} isCompleted={completedTasks.includes(task.id)} />
            ))}
          </div>
        </div>

        {/* Advanced Tasks */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-2">
            <Star className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Tareas Avanzadas</h2>
            <Badge variant="outline" className="text-xs">
              {advancedCompleted}/{advancedTasks.length}
            </Badge>
          </div>
          <div className="space-y-2">
            {advancedTasks.map((task) => (
              <TaskItem key={task.id} task={task} isCompleted={completedTasks.includes(task.id)} />
            ))}
          </div>
        </div>
      </div>

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <HelpCircle className="w-5 h-5" />
            ¿Necesitas ayuda?
          </CardTitle>
          <CardDescription>Nuestro equipo está aquí para apoyarte</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Button variant="outline" className="justify-start gap-2 h-auto py-3 bg-transparent">
              <MessageCircle className="w-4 h-4 text-blue-600" />
              <div className="text-left">
                <div className="font-medium text-sm">Chat en Vivo</div>
                <div className="text-xs text-gray-600">Soporte inmediato</div>
              </div>
            </Button>
            <Button variant="outline" className="justify-start gap-2 h-auto py-3 bg-transparent">
              <Mail className="w-4 h-4 text-green-600" />
              <div className="text-left">
                <div className="font-medium text-sm">Email</div>
                <div className="text-xs text-gray-600">soporte@physia.com</div>
              </div>
            </Button>
            <Button variant="outline" className="justify-start gap-2 h-auto py-3 bg-transparent">
              <Phone className="w-4 h-4 text-purple-600" />
              <div className="text-left">
                <div className="font-medium text-sm">Teléfono</div>
                <div className="text-xs text-gray-600">+34 900 123 456</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Task Guide Modal */}
      {selectedTask && (
        <TaskGuideModal
          task={selectedTask}
          isOpen={showModal}
          onClose={() => {
            setShowModal(false)
            setSelectedTask(null)
          }}
          onComplete={() => {
            if (selectedTask && !completedTasks.includes(selectedTask.id)) {
              saveCompletedTasks([...completedTasks, selectedTask.id])
            }
          }}
          isCompleted={selectedTask ? completedTasks.includes(selectedTask.id) : false}
        />
      )}

      {/* Invite Professional Modal */}
      <Dialog
        open={showInviteModal}
        onOpenChange={(open) => {
          setShowInviteModal(open)
          if (!open) resetInviteModal()
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Invitar Nuevo Profesional</DialogTitle>
            <DialogDescription>
              Se enviará un Magic Link al email para que el profesional pueda acceder y establecer su contraseña.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="user-email">Email</Label>
              <Input
                id="user-email"
                type="email"
                value={userForm.email}
                onChange={(e) => setUserForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="usuario@ejemplo.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="user-name">Nombre completo</Label>
              <Input
                id="user-name"
                type="text"
                value={userForm.name}
                onChange={(e) => setUserForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Juan Pérez"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="user-role">Rol</Label>
              <Select
                value={userForm.role}
                onValueChange={(value: "user" | "admin" | "coordinador") =>
                  setUserForm((prev) => ({ ...prev, role: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Usuario</SelectItem>
                  <SelectItem value="coordinador">Coordinador</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Los usuarios normales solo pueden ver sus propios datos. Los coordinadores tienen acceso limitado. Los
                administradores pueden gestionar toda la organización.
              </p>
            </div>

            {inviteError && (
              <Alert variant="destructive">
                <AlertDescription>{inviteError}</AlertDescription>
              </Alert>
            )}

            {inviteResult && (
              <Alert>
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium text-green-800">¡Invitación enviada exitosamente!</p>
                    <div className="bg-white p-3 rounded border space-y-1 text-sm">
                      <p>
                        <strong>Email:</strong> {inviteResult.user.email}
                      </p>
                      <p>
                        <strong>Nombre:</strong> {inviteResult.user.name}
                      </p>
                      <p>
                        <strong>Rol:</strong> {inviteResult.user.role}
                      </p>
                      <Separator className="my-2" />
                      <div className="bg-blue-50 p-2 rounded">
                        <p className="text-blue-800 font-medium">📧 Magic Link enviado</p>
                        <p className="text-xs text-blue-600">
                          El profesional recibirá un email con un enlace para acceder y establecer su contraseña.
                        </p>
                      </div>
                      <div className="bg-amber-50 p-2 rounded border border-amber-200">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-amber-800 font-medium text-xs">⚠️ Recordatorio importante</p>
                            <p className="text-xs text-amber-700">
                              No olvides asignar los servicios correspondientes a este profesional en la sección de
                              servicios o desde el calendario.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowInviteModal(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={inviteLoading}>
                {inviteLoading ? "Enviando invitación..." : "Enviar Invitación"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Self-Onboarding Tour Modal (for both interactive and non-interactive tours) */}
      {showOnboardingTour && onboardingSteps && (
        <SelfOnboardingTour
          steps={onboardingSteps}
          onClose={() => {
            setShowOnboardingTour(false)
            setOnboardingSteps(null)
          }}
          onFinish={() => {
            setShowOnboardingTour(false)
            setOnboardingSteps(null)
            const currentTask = taskGuides.find(
              (task) =>
                task.steps === onboardingSteps && (task.action?.type === "interactive-tour" || task.selfOnboarding),
            )
            if (currentTask && !completedTasks.includes(currentTask.id)) {
              saveCompletedTasks([...completedTasks, currentTask.id])
            }
          }}
        />
      )}

      {/* ChatBot component with context about current tasks */}
      <ChatBot
        context={{
          currentTasks: taskGuides.filter((task) => !completedTasks.includes(task.id)).map((task) => task.title),
          completedTasks: taskGuides.filter((task) => completedTasks.includes(task.id)).map((task) => task.title),
          currentPage: "help",
        }}
      />
    </div>
  )
}
