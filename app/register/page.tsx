"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { modernSupabase } from "@/lib/supabase/modern-client"
import { PlanSelector } from "@/components/plan-selector"
import { Loader2, CheckCircle, ArrowLeft } from "lucide-react"
import { STRIPE_PLANS } from "@/lib/stripe-config"

export default function RegisterPage() {
  const [step, setStep] = useState(1) // 1: form, 2: plan selection
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [organizationName, setOrganizationName] = useState("")
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!email || !password || !name || !phone || !organizationName) {
      setError("Todos los campos son obligatorios")
      return
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres")
      return
    }
    if (phone.length < 7) {
      setError("El número de teléfono debe tener al menos 7 dígitos")
      return
    }

    setStep(2)
  }

  const handleCompleteRegistration = async () => {
    if (!selectedPlan) {
      setError("Por favor selecciona un plan")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      console.log("🔄 Iniciando proceso de registro completo...")

      // 1. Crear cliente en Stripe
      console.log("💳 Creando cliente en Stripe...")
      const stripeResponse = await fetch("/api/create-stripe-customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim(),
          phone: phone.trim(),
          organizationName: organizationName.trim(),
        }),
      })

      if (!stripeResponse.ok) {
        const errorText = await stripeResponse.text()
        console.error("❌ Stripe customer API error:", errorText)
        throw new Error(
          `Error del servidor (${stripeResponse.status}): ${errorText.includes("<!DOCTYPE") ? "API endpoint no encontrado" : errorText}`,
        )
      }

      let stripeData
      try {
        stripeData = await stripeResponse.json()
      } catch (parseError) {
        console.error("❌ Error parsing Stripe response:", parseError)
        throw new Error("El servidor devolvió una respuesta inválida. Verifica que la API esté funcionando.")
      }

      if (!stripeData.success) {
        throw new Error(stripeData.error || "Error creando cliente en Stripe")
      }

      console.log("✅ Cliente Stripe creado:", stripeData.customerId)

      // 2. Crear suscripción en Stripe
      const planConfig = Object.values(STRIPE_PLANS).find((plan) => plan.id === selectedPlan)
      if (!planConfig) throw new Error(`Plan no válido: ${selectedPlan}`)

      console.log("📝 Creando suscripción en Stripe...")
      const subResponse = await fetch("/api/create-suscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: stripeData.customerId,
          priceId: planConfig.stripePriceId,
          planId: selectedPlan,
        }),
      })

      if (!subResponse.ok) {
        const errorText = await subResponse.text()
        console.error("❌ Subscription API error:", errorText)
        throw new Error(
          `Error del servidor (${subResponse.status}): ${errorText.includes("<!DOCTYPE") ? "API endpoint no encontrado" : errorText}`,
        )
      }

      let subData
      try {
        subData = await subResponse.json()
      } catch (parseError) {
        console.error("❌ Error parsing subscription response:", parseError)
        throw new Error("El servidor devolvió una respuesta inválida. Verifica que la API esté funcionando.")
      }

      if (!subData.success) {
        throw new Error(subData.error || "Error creando suscripción")
      }

      console.log("✅ Suscripción Stripe creada:", subData.subscriptionId)

      // 3. Crear usuario en Supabase
      console.log("👤 Creando usuario en Supabase...")
      const { data: authData, error: authError } = await modernSupabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
          data: {
            name: name.trim(),
            phone: phone.trim(),
            organization_name: organizationName.trim(),
            stripe_customer_id: stripeData.customerId,
            stripe_subscription_id: subData.subscriptionId,
            selected_plan: selectedPlan,
          },
        },
      })

      if (authError) {
        console.error("❌ Error en signUp:", authError)
        if (authError.message.includes("already registered")) {
          setError("Este email ya está registrado. ¿Quieres iniciar sesión?")
        } else if (authError.message.includes("invalid email")) {
          setError("El formato del email no es válido")
        } else if (authError.message.includes("weak password")) {
          setError("La contraseña es muy débil. Debe tener al menos 6 caracteres")
        } else {
          setError(authError.message)
        }
        return
      }

      if (authData.user) {
        console.log("✅ Usuario creado:", authData.user.email)
        console.log("📧 Necesita confirmación:", !authData.session)

        setSuccess(true)
      }
    } catch (err: any) {
      console.error("💥 Registration error:", err)
      setError("Error inesperado durante el registro: " + (err.message || "Inténtalo de nuevo"))
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-8">
          <div className="w-32 h-32 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-16 h-16 text-green-600" />
          </div>
          <div className="space-y-4">
            <h1 className="text-2xl font-semibold text-gray-900">¡Cuenta creada!</h1>
            <p className="text-gray-600">
              Revisa tu email <span className="font-medium text-gray-900">{email}</span> para confirmar tu cuenta. Una
              vez confirmada, podrás configurar tu método de pago y activar tu suscripción.
            </p>
          </div>
          <div className="space-y-3">
            <Link
              href="/login"
              className="block w-full py-3 px-4 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              Ir al login
            </Link>
            <button
              onClick={() => {
                setSuccess(false)
                setStep(1)
                setEmail("")
                setPassword("")
                setName("")
                setPhone("")
                setOrganizationName("")
                setSelectedPlan(null)
                setError("")
              }}
              className="block w-full py-3 px-4 text-gray-600 hover:text-gray-900 transition-colors"
            >
              Registrar otra cuenta
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="text-center pt-16 pb-12">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 via-purple-700 to-purple-800 bg-clip-text text-transparent tracking-tight">
          ¡Bienvenido a Physia! ✨
        </h1>
      </div>

      <div className="flex items-center justify-center px-4 pb-12">
        <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-20 items-center">
          {/* Imagen */}
          <div className="flex justify-center lg:justify-end order-2 lg:order-1">
            <div className="w-full max-w-lg">
              <img src="/images/physia-mascot.png" alt="Physia" className="w-full h-auto" />
            </div>
          </div>

          {/* Formulario / Plan Selector */}
          <div className="flex justify-center lg:justify-start order-1 lg:order-2">
            <div className="w-full max-w-sm">
              {step === 2 && (
                <div className="mb-6">
                  <button
                    onClick={() => setStep(1)}
                    className="flex items-center gap-2 text-purple-600 hover:text-purple-700 transition-colors mb-4"
                    disabled={isLoading}
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Volver a los datos
                  </button>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <div className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-medium">
                      ✓
                    </div>
                    <span>Datos personales</span>
                    <div className="flex-1 h-px bg-gray-200"></div>
                    <div className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-medium">
                      2
                    </div>
                    <span>Plan</span>
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="mb-8">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-2">Crear cuenta</h2>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <div className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-medium">
                      1
                    </div>
                    <span>Datos personales</span>
                    <div className="flex-1 h-px bg-gray-200"></div>
                    <div className="w-6 h-6 bg-gray-200 text-gray-500 rounded-full flex items-center justify-center text-xs font-medium">
                      2
                    </div>
                    <span>Plan</span>
                  </div>
                </div>
              )}

              {error && (
                <div className="mb-6 p-4 text-sm text-red-600 bg-red-50 rounded-xl border border-red-100">{error}</div>
              )}

              {step === 1 ? (
                <form onSubmit={handleFormSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre completo</Label>
                    <Input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Correo electrónico</Label>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Contraseña</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="organizationName">Nombre de tu clínica</Label>
                    <Input
                      id="organizationName"
                      type="text"
                      value={organizationName}
                      onChange={(e) => setOrganizationName(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full mt-8">
                    Continuar al plan
                  </Button>
                </form>
              ) : (
                <div className="space-y-6">
                  <PlanSelector selectedPlan={selectedPlan} onPlanSelect={setSelectedPlan} disabled={isLoading} />
                  <Button onClick={handleCompleteRegistration} className="w-full" disabled={isLoading || !selectedPlan}>
                    {isLoading ? (
                      <div className="flex items-center">
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Creando cuenta...
                      </div>
                    ) : (
                      "Crear cuenta"
                    )}
                  </Button>
                </div>
              )}

              <div className="mt-8 text-center">
                <p className="text-sm text-gray-500">
                  ¿Ya tienes cuenta?{" "}
                  <Link href="/login" className="text-purple-600 hover:text-purple-700 font-semibold">
                    Inicia sesión
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
