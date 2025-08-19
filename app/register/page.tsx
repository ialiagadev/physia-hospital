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
import { Loader2, CheckCircle } from "lucide-react"
import { STRIPE_PLANS } from "@/lib/stripe-config"
import { PaymentSetup } from "@/components/payment-setup"

export default function RegisterPage() {
  const [step, setStep] = useState(1) // 1: form, 2: plan selection, 3: payment
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [organizationName, setOrganizationName] = useState("")
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("yearly")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [subscriptionData, setSubscriptionData] = useState<{
    subscriptionId: string
    clientSecret: string
    trialEnd?: string | null   // 👈 añadimos trialEnd
    customerId: string
  } | null>(null)
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
          `Error del servidor (${stripeResponse.status}): ${
            errorText.includes("<!DOCTYPE") ? "API endpoint no encontrado" : errorText
          }`,
        )
      }

      const stripeData = await stripeResponse.json()
      if (!stripeData.success) {
        throw new Error(stripeData.error || "Error creando cliente en Stripe")
      }

      console.log("✅ Cliente Stripe creado:", stripeData.customerId)

      // 2. Crear suscripción en Stripe
      const planConfig = Object.values(STRIPE_PLANS).find((plan) => plan.id === selectedPlan)
      if (!planConfig) throw new Error(`Plan no válido: ${selectedPlan}`)
      
      const priceId = planConfig.prices[billingPeriod].priceId // 👈 ahora solo el string correcto
      

      console.log("📝 Creando suscripción en Stripe con:", { planId: selectedPlan, billingPeriod, priceId })
      const subResponse = await fetch("/api/create-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: stripeData.customerId,
          planId: selectedPlan,
          billingPeriod,
        }),
      })

      if (!subResponse.ok) {
        const errorText = await subResponse.text()
        console.error("❌ Subscription API error:", errorText)
        throw new Error(
          `Error del servidor (${subResponse.status}): ${
            errorText.includes("<!DOCTYPE") ? "API endpoint no encontrado" : errorText
          }`,
        )
      }

      const subData = await subResponse.json()
      if (!subData.success) {
        throw new Error(subData.error || "Error creando suscripción")
      }

      console.log("✅ Suscripción Stripe creada:", subData.subscriptionId)
      console.log("📦 Datos completos de la suscripción recibidos:", subData)
      
      setSubscriptionData({
        subscriptionId: subData.subscriptionId,
        clientSecret: subData.clientSecret,
        customerId: stripeData.customerId,
        trialEnd: subData.trialEnd, // 👈 debería venir de Stripe en segundos -> tú lo pasas a ISO
      })
      console.log("📝 SubscriptionData almacenado en estado:", {
        subscriptionId: subData.subscriptionId,
        clientSecret: subData.clientSecret,
        customerId: stripeData.customerId,
        trialEnd: subData.trialEnd,
      })
      

      setStep(3) // Move to payment step
    } catch (err: any) {
      console.error("💥 Registration error:", err)
      setError("Error inesperado durante el registro: " + (err.message || "Inténtalo de nuevo"))
    } finally {
      setIsLoading(false)
    }
  }

  const handlePaymentSuccess = async () => {
    if (!subscriptionData) {
      console.warn("⚠️ No hay subscriptionData en handlePaymentSuccess")
      return
    }
  
    setIsLoading(true)
    setError("")
  
    try {
      console.log("👤 Creando usuario en Supabase con metadata...")
      console.log("📦 Metadata que voy a guardar:", {
        name: name.trim(),
        phone: phone.trim(),
        organization_name: organizationName.trim(),
        stripe_customer_id: subscriptionData.customerId,
        stripe_subscription_id: subscriptionData.subscriptionId,
        selected_plan: selectedPlan,
        billing_period: billingPeriod,
        trial_end: subscriptionData.trialEnd,
      })
  
      const { data: authData, error: authError } = await modernSupabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
          data: {
            name: name.trim(),
            phone: phone.trim(),
            organization_name: organizationName.trim(),
            stripe_customer_id: subscriptionData.customerId,
            stripe_subscription_id: subscriptionData.subscriptionId,
            selected_plan: selectedPlan,
            billing_period: billingPeriod,
            trial_end: subscriptionData.trialEnd,
          },
        },
      })
  
      if (authError) {
        console.error("❌ Error en signUp:", authError)
        setError(authError.message)
        return
      }
  
      if (authData.user) {
        console.log("✅ Usuario creado en Supabase:", authData.user.email)
        console.log("🔎 user_metadata guardado:", authData.user.user_metadata)
        setSuccess(true)
      }
    } catch (err: any) {
      console.error("💥 User creation error:", err)
      setError("Error creando usuario: " + (err.message || "Inténtalo de nuevo"))
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
          <h1 className="text-2xl font-semibold text-gray-900">¡Cuenta creada!</h1>
          <p className="text-gray-600">
            Revisa tu email <span className="font-medium text-gray-900">{email}</span> para confirmar tu cuenta.
          </p>
          <Link
            href="/login"
            className="block w-full py-3 px-4 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
          >
            Ir al login
          </Link>
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

      <div className="flex justify-center px-4 pb-8">
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= 1 ? "bg-purple-600 text-white" : "bg-gray-200 text-gray-500"
              }`}
            >
              1
            </div>
            <span className={`ml-2 text-sm font-medium ${step >= 1 ? "text-purple-600" : "text-gray-500"}`}>Datos</span>
          </div>
          <div className={`w-8 h-0.5 ${step >= 2 ? "bg-purple-600" : "bg-gray-200"}`} />
          <div className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= 2 ? "bg-purple-600 text-white" : "bg-gray-200 text-gray-500"
              }`}
            >
              2
            </div>
            <span className={`ml-2 text-sm font-medium ${step >= 2 ? "text-purple-600" : "text-gray-500"}`}>Plan</span>
          </div>
          <div className={`w-8 h-0.5 ${step >= 3 ? "bg-purple-600" : "bg-gray-200"}`} />
          <div className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= 3 ? "bg-purple-600 text-white" : "bg-gray-200 text-gray-500"
              }`}
            >
              3
            </div>
            <span className={`ml-2 text-sm font-medium ${step >= 3 ? "text-purple-600" : "text-gray-500"}`}>Pago</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center px-4 pb-12">
        <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-20 items-center">
          {/* Imagen */}
          <div className="flex justify-center lg:justify-end order-2 lg:order-1">
            <img src="/images/physia-mascot.png" alt="Physia" className="w-full max-w-lg" />
          </div>

          {/* Formulario / Plan Selector / Payment Setup */}
          <div className="flex justify-center lg:justify-start order-1 lg:order-2">
            <div className="w-full max-w-sm">
              {step === 1 && (
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
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <div className="w-full">
                    <PlanSelector
                      selectedPlan={selectedPlan}
                      onPlanSelect={setSelectedPlan}
                      billingPeriod={billingPeriod}
                      onBillingPeriodChange={setBillingPeriod}
                      disabled={isLoading}
                    />
                  </div>
                  <Button onClick={handleCompleteRegistration} className="w-full" disabled={isLoading || !selectedPlan}>
                    {isLoading ? (
                      <div className="flex items-center">
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Preparando pago...
                      </div>
                    ) : (
                      "Continuar al pago"
                    )}
                  </Button>
                </div>
              )}

              {step === 3 && subscriptionData && (
                <PaymentSetup
                  clientSecret={subscriptionData.clientSecret}
                  onSuccess={handlePaymentSuccess}
                  onError={setError}
                  planName={Object.values(STRIPE_PLANS).find((p) => p.id === selectedPlan)?.name || ""}
                  planPrice={
                    Object.values(STRIPE_PLANS).find((p) => p.id === selectedPlan)?.prices[billingPeriod].priceId || ""
                  }
                />
              )}

              {error && <div className="mt-4 p-4 text-sm text-red-600 bg-red-50 rounded-xl">{error}</div>}

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
