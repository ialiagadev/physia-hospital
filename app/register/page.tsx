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
  const [step, setStep] = useState(1)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [organizationName, setOrganizationName] = useState("")
  const [taxId, setTaxId] = useState("")

  // Dirección
  const [addressLine1, setAddressLine1] = useState("")
  const [city, setCity] = useState("")
  const [postalCode, setPostalCode] = useState("")
  const [country, setCountry] = useState("ES") // por defecto España

  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("yearly")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [subscriptionData, setSubscriptionData] = useState<{
    subscriptionId: string
    clientSecret: string
    trialEnd?: string | null
    customerId: string
  } | null>(null)
  const router = useRouter()

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (
      !email ||
      !password ||
      !name ||
      !phone ||
      !organizationName ||
      !taxId ||
      !addressLine1 ||
      !city ||
      !postalCode
    ) {
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
      const stripeResponse = await fetch("/api/create-stripe-customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim(),
          phone: phone.trim(),
          organizationName: organizationName.trim(),
          taxId: taxId.trim(),
          address: {
            line1: addressLine1.trim(),
            city: city.trim(),
            postal_code: postalCode.trim(),
            country: country.trim(),
          },
        }),
      })

      if (!stripeResponse.ok) {
        const errorText = await stripeResponse.text()
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

      const priceId = planConfig.prices[billingPeriod].priceId

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

      setSubscriptionData({
        subscriptionId: subData.subscriptionId,
        clientSecret: subData.clientSecret,
        customerId: stripeData.customerId,
        trialEnd: subData.trialEnd,
      })

      setStep(3)
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
      const { data: authData, error: authError } = await modernSupabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `http://localhost:3000/auth/callback`,
          data: {
            name: name.trim(),
            phone: phone.trim(),
            organization_name: organizationName.trim(),
            tax_id: taxId.trim(),
            address_line1: addressLine1.trim(),
            city: city.trim(),
            postal_code: postalCode.trim(),
            country: country.trim(),
            stripe_customer_id: subscriptionData.customerId,
            stripe_subscription_id: subscriptionData.subscriptionId,
            selected_plan: selectedPlan,
            billing_period: billingPeriod,
            trial_end: subscriptionData.trialEnd,
          },
        },
      })

      if (authError) {
        setError(authError.message)
        return
      }

      if (authData.user) {
        setSuccess(true)
      }
    } catch (err: any) {
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
      <div className="text-center pt-8 pb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-purple-700 to-purple-800 bg-clip-text text-transparent tracking-tight">
          ¡Bienvenido a Healthmate! ✨
        </h1>
      </div>

      <div className="flex justify-center px-4 pb-4">
        <div className="flex items-center space-x-4">
          {/* Paso 1-3 */}
          <div className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step >= 1 ? "bg-purple-600 text-white" : "bg-gray-200 text-gray-500"}`}
            >
              1
            </div>
            <span className={`ml-2 text-sm font-medium ${step >= 1 ? "text-purple-600" : "text-gray-500"}`}>Datos</span>
          </div>
          <div className={`w-8 h-0.5 ${step >= 2 ? "bg-purple-600" : "bg-gray-200"}`} />
          <div className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step >= 2 ? "bg-purple-600 text-white" : "bg-gray-200 text-gray-500"}`}
            >
              2
            </div>
            <span className={`ml-2 text-sm font-medium ${step >= 2 ? "text-purple-600" : "text-gray-500"}`}>Plan</span>
          </div>
          <div className={`w-8 h-0.5 ${step >= 3 ? "bg-purple-600" : "bg-gray-200"}`} />
          <div className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step >= 3 ? "bg-purple-600 text-white" : "bg-gray-200 text-gray-500"}`}
            >
              3
            </div>
            <span className={`ml-2 text-sm font-medium ${step >= 3 ? "text-purple-600" : "text-gray-500"}`}>Pago</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center px-4 pb-6">
        <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-12 items-center">
          <div className="flex justify-center lg:justify-end order-2 lg:order-1">
            <img src="/images/physia-mascot.png" alt="Physia" className="w-full max-w-sm" />
          </div>

          <div className="flex justify-center lg:justify-start order-1 lg:order-2">
            <div className="w-full max-w-sm">
              {step === 1 && (
                <form onSubmit={handleFormSubmit} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="name" className="text-sm">
                        Nombre completo
                      </Label>
                      <Input
                        id="name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="email" className="text-sm">
                        Email
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="h-9"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="phone" className="text-sm">
                        Teléfono
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="password" className="text-sm">
                        Contraseña
                      </Label>
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        className="h-9"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="organizationName" className="text-sm">
                      Nombre de tu clínica
                    </Label>
                    <Input
                      id="organizationName"
                      type="text"
                      value={organizationName}
                      onChange={(e) => setOrganizationName(e.target.value)}
                      required
                      className="h-9"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="taxId" className="text-sm">
                      CIF / NIF
                    </Label>
                    <Input
                      id="taxId"
                      type="text"
                      value={taxId}
                      onChange={(e) => setTaxId(e.target.value)}
                      required
                      className="h-9"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="addressLine1" className="text-sm">
                      Dirección
                    </Label>
                    <Input
                      id="addressLine1"
                      type="text"
                      value={addressLine1}
                      onChange={(e) => setAddressLine1(e.target.value)}
                      required
                      className="h-9"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="city" className="text-sm">
                        Ciudad
                      </Label>
                      <Input
                        id="city"
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        required
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="postalCode" className="text-sm">
                        C.P.
                      </Label>
                      <Input
                        id="postalCode"
                        type="text"
                        value={postalCode}
                        onChange={(e) => setPostalCode(e.target.value)}
                        required
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="country" className="text-sm">
                        País
                      </Label>
                      <Input
                        id="country"
                        type="text"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        required
                        className="h-9"
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full mt-4 h-10">
                    Continuar al plan
                  </Button>
                </form>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <PlanSelector
                    selectedPlan={selectedPlan}
                    onPlanSelect={setSelectedPlan}
                    billingPeriod={billingPeriod}
                    onBillingPeriodChange={setBillingPeriod}
                    disabled={isLoading}
                  />
                  <Button
                    onClick={handleCompleteRegistration}
                    className="w-full h-10"
                    disabled={isLoading || !selectedPlan}
                  >
                    {isLoading ? (
                      <div className="flex items-center">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Preparando pago...
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
                  subscriptionId={subscriptionData.subscriptionId}
                  onSuccess={handlePaymentSuccess}
                  onError={setError}
                  planName={Object.values(STRIPE_PLANS).find((p) => p.id === selectedPlan)?.name || ""}
                  planPrice={
                    Object.values(STRIPE_PLANS).find((p) => p.id === selectedPlan)?.prices[billingPeriod].priceId || ""
                  }
                />
              )}

              {error && <div className="mt-3 p-3 text-sm text-red-600 bg-red-50 rounded-xl">{error}</div>}

              <div className="mt-4 text-center">
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
