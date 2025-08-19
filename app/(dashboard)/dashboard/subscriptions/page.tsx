"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useAuth } from "@/app/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, AlertTriangle, Info, CreditCard, XCircle, ArrowLeft, RefreshCw, Edit } from "lucide-react"
import { CardElement, useStripe, useElements, Elements } from "@stripe/react-stripe-js"
import { loadStripe } from "@stripe/stripe-js"
import { useRouter } from "next/navigation"
import { PlanSelector } from "@/components/plan-selector"
import { PaymentSetup } from "@/components/payment-setup"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

export default function SubscriptionsPage() {
  const router = useRouter()
  const { userProfile, isLoading: authLoading } = useAuth()
  const [organization, setOrganization] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [subscriptionDetails, setSubscriptionDetails] = useState<any>(null)
  const [loadingSubscriptionDetails, setLoadingSubscriptionDetails] = useState(false)
  const [cancelingSubscription, setCancelingSubscription] = useState(false)
  const [showUpdatePayment, setShowUpdatePayment] = useState(false)
  const [showPlanSelector, setShowPlanSelector] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly")
  const [showPaymentSetup, setShowPaymentSetup] = useState(false)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [processingPlan, setProcessingPlan] = useState(false)
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "warning" | "info"
    message: string
  } | null>(null)

  const showNotification = (type: "success" | "error" | "warning" | "info", message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 5000)
  }

  const handlePlanChange = async () => {
    if (!selectedPlan || !organization) return

    setProcessingPlan(true)

    try {
      const isReactivation = !organization.stripe_subscription_id || subscriptionDetails?.status === "canceled"

      const action = isReactivation ? "reactivate" : "update"

      const response = await fetch("/api/subscription-management", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          customerId: organization.stripe_customer_id,
          planId: selectedPlan,
          billingPeriod,
          subscriptionId: organization.stripe_subscription_id,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Error processing plan change")
      }

      if (data.requiresPayment && data.clientSecret) {
        // Requires payment confirmation
        setClientSecret(data.clientSecret)
        setShowPaymentSetup(true)
      } else {
        // Plan updated successfully
        showNotification(
          "success",
          isReactivation ? "Suscripción reactivada correctamente" : "Plan actualizado correctamente",
        )
        setShowPlanSelector(false)
        setSelectedPlan(null)

        // Update organization data
        setOrganization((prev: any) => ({
          ...prev,
          stripe_subscription_id: data.subscriptionId,
          subscription_status: data.status,
        }))

        // Reload subscription details
        loadSubscriptionDetails()
      }
    } catch (err: any) {
      console.error("Error changing plan:", err)
      showNotification("error", err.message || "Error al cambiar el plan")
    } finally {
      setProcessingPlan(false)
    }
  }

  const handlePaymentSetupSuccess = () => {
    showNotification("success", "Suscripción activada correctamente")
    setShowPaymentSetup(false)
    setShowPlanSelector(false)
    setClientSecret(null)
    setSelectedPlan(null)

    // Reload data
    loadSubscriptionDetails()
  }

  const handlePaymentSetupError = (error: string) => {
    showNotification("error", error)
  }

  const UpdatePaymentForm = ({ onSuccess }: { onSuccess: () => void }) => {
    const stripe = useStripe()
    const elements = useElements()
    const [isProcessing, setIsProcessing] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    const handleSubmit = async (event: React.FormEvent) => {
      event.preventDefault()

      if (!stripe || !elements) {
        setErrorMessage("Stripe no está disponible")
        return
      }

      const cardElement = elements.getElement(CardElement)
      if (!cardElement) {
        setErrorMessage("Elemento de tarjeta no encontrado")
        return
      }

      setIsProcessing(true)
      setErrorMessage(null)

      try {
        const { error: stripeError, paymentMethod } = await stripe.createPaymentMethod({
          type: "card",
          card: cardElement,
        })

        if (stripeError) {
          throw new Error(stripeError.message)
        }

        const response = await fetch("/api/update-payment-method", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentMethodId: paymentMethod.id,
          }),
        })

        const data = await response.json()

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Error del servidor")
        }

        onSuccess()
        setShowUpdatePayment(false)
      } catch (err: any) {
        setErrorMessage(err.message || "Error actualizando método de pago")
      } finally {
        setIsProcessing(false)
      }
    }

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-4 border rounded-lg bg-gray-50">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: "16px",
                  color: "#424770",
                  "::placeholder": {
                    color: "#aab7c4",
                  },
                },
              },
            }}
          />
        </div>

        {errorMessage && (
          <Alert className="border-red-500 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{errorMessage}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-3">
          <Button type="submit" disabled={!stripe || isProcessing} className="flex-1">
            {isProcessing ? "Procesando..." : "Actualizar método de pago"}
          </Button>
          <Button type="button" variant="outline" onClick={() => setShowUpdatePayment(false)} disabled={isProcessing}>
            Cancelar
          </Button>
        </div>
      </form>
    )
  }

  const handleCancelSubscription = async () => {
    if (!organization?.stripe_subscription_id) {
      showNotification("warning", "Esta organización no tiene suscripción activa")
      return
    }

    if (!confirm(`¿Estás seguro de que quieres cancelar la suscripción de ${organization.name}?`)) {
      return
    }

    setCancelingSubscription(true)

    try {
      const response = await fetch("/api/cancel-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Error cancelando suscripción")
      }

      setOrganization((prev: any) => ({ ...prev, subscription_status: "canceled" }))
      showNotification("success", `Suscripción de ${organization.name} cancelada correctamente`)

      // Recargar detalles de suscripción
      loadSubscriptionDetails()
    } catch (err: any) {
      console.error("Error cancelando suscripción:", err)
      showNotification("error", err.message || "Error cancelando la suscripción")
    } finally {
      setCancelingSubscription(false)
    }
  }

  const handleUpdatePaymentSuccess = () => {
    showNotification("success", `Método de pago actualizado correctamente`)
    loadSubscriptionDetails()
  }

  const getSubscriptionStatus = (org: any) => {
    if (!org?.subscription_status) {
      return <span className="text-gray-500 text-sm">Sin suscripción</span>
    }

    switch (org.subscription_status) {
      case "active":
        return (
          <span className="inline-flex items-center gap-1 text-green-600 text-sm">
            <CheckCircle className="h-4 w-4" />
            Activa
          </span>
        )
      case "trialing":
        return (
          <span className="inline-flex items-center gap-1 text-blue-600 text-sm">
            <Info className="h-4 w-4" />
            Prueba
          </span>
        )
      case "canceled":
        return (
          <span className="inline-flex items-center gap-1 text-red-600 text-sm">
            <XCircle className="h-4 w-4" />
            Cancelada
          </span>
        )
      case "past_due":
        return (
          <span className="inline-flex items-center gap-1 text-orange-600 text-sm">
            <AlertTriangle className="h-4 w-4" />
            Pago pendiente
          </span>
        )
      default:
        return <span className="text-gray-500 text-sm">{org.subscription_status}</span>
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "No disponible"
    return dateString
  }

  const getSubscriptionMessage = (details: any) => {
    if (!details) return null

    if (details.status === "canceled") {
      return (
        <Alert className="border-red-500 bg-red-50">
          <XCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Suscripción cancelada:</strong> Tu suscripción fue cancelada el {formatDate(details.canceled_at)}.
            {details.access_until && ` Tienes acceso hasta el ${formatDate(details.access_until)}.`}
          </AlertDescription>
        </Alert>
      )
    }

    if (details.cancel_at_period_end) {
      return (
        <Alert className="border-orange-500 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <strong>Suscripción cancelada:</strong> Tu suscripción terminará el {formatDate(details.current_period_end)}{" "}
            y no se renovará automáticamente.
          </AlertDescription>
        </Alert>
      )
    }

    if (details.status === "active") {
      return (
        <Alert className="border-green-500 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>Suscripción activa:</strong> Tu próximo pago será el {formatDate(details.current_period_end)}.
          </AlertDescription>
        </Alert>
      )
    }

    if (details.status === "trialing" && details.trial_end) {
      return (
        <Alert className="border-blue-500 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Período de prueba:</strong> Tu prueba gratuita termina el {formatDate(details.trial_end)}.
          </AlertDescription>
        </Alert>
      )
    }

    return null
  }

  const loadSubscriptionDetails = async (org?: any) => {
    const targetOrg = org || organization
    if (!targetOrg?.stripe_subscription_id) return

    setLoadingSubscriptionDetails(true)
    try {
      const response = await fetch("/api/subscription-details")
      const data = await response.json()

      if (data.success && data.subscription) {
        setSubscriptionDetails(data.subscription)
      } else {
        showNotification("error", data.error || "Error cargando detalles de suscripción")
      }
    } catch (error) {
      showNotification("error", "Error de conexión al cargar detalles de suscripción")
    } finally {
      setLoadingSubscriptionDetails(false)
    }
  }

  useEffect(() => {
    const loadData = async () => {
      if (authLoading) return

      if (!userProfile?.organization_id) {
        setError("No se encontró organización asociada al usuario")
        setLoading(false)
        return
      }

      try {
        const { supabase } = await import("@/lib/supabase/client")
        const { data: org, error: orgError } = await supabase
          .from("organizations")
          .select("*, stripe_customer_id, stripe_subscription_id, subscription_status")
          .eq("id", userProfile.organization_id)
          .single()

        if (orgError) {
          setError("Error al cargar organización")
        } else {
          setOrganization(org)
          if (org?.stripe_subscription_id) {
            loadSubscriptionDetails(org)
          }
        }

        setLoading(false)
      } catch (err) {
        setError("Error inesperado")
        setLoading(false)
      }
    }

    loadData()
  }, [authLoading, userProfile])

  if (authLoading || loading) return <div className="p-6">Cargando información de suscripción...</div>
  if (error) return <div className="p-6">Error: {error}</div>

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()} className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <CreditCard className="h-8 w-8" />
            Gestión de Suscripción
          </h1>
          <p className="text-muted-foreground">Administra tu suscripción y método de pago</p>
        </div>
      </div>

      {notification && (
        <Alert
          className={`${
            notification.type === "success"
              ? "border-green-500 bg-green-50"
              : notification.type === "error"
                ? "border-red-500 bg-red-50"
                : notification.type === "warning"
                  ? "border-yellow-500 bg-yellow-50"
                  : "border-blue-500 bg-blue-50"
          }`}
        >
          {notification.type === "success" && <CheckCircle className="h-4 w-4 text-green-600" />}
          {notification.type === "error" && <AlertTriangle className="h-4 w-4 text-red-600" />}
          {notification.type === "warning" && <AlertTriangle className="h-4 w-4 text-yellow-600" />}
          {notification.type === "info" && <Info className="h-4 w-4 text-blue-600" />}
          <AlertDescription
            className={`${
              notification.type === "success"
                ? "text-green-800"
                : notification.type === "error"
                  ? "text-red-800"
                  : notification.type === "warning"
                    ? "text-yellow-800"
                    : "text-blue-800"
            }`}
          >
            {notification.message}
          </AlertDescription>
        </Alert>
      )}

      {organization && (
        <div className="space-y-6">
          <div className="bg-white border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Información de la Organización</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <strong>Nombre:</strong> {organization.name}
              </div>
              <div>
                <strong>Estado:</strong> {getSubscriptionStatus(organization)}
              </div>
            </div>
          </div>

          {showPaymentSetup && clientSecret && selectedPlan ? (
            <div className="bg-white border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Confirmar Pago</h3>
              <PaymentSetup
                clientSecret={clientSecret}
                onSuccess={handlePaymentSetupSuccess}
                onError={handlePaymentSetupError}
                planName={selectedPlan}
                planPrice={`${billingPeriod === "monthly" ? "Mensual" : "Anual"}`}
              />
            </div>
          ) : showPlanSelector ? (
            <div className="bg-white border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">
                {!organization.stripe_subscription_id || subscriptionDetails?.status === "canceled"
                  ? "Reactivar Suscripción"
                  : "Cambiar Plan"}
              </h3>

              <div className="space-y-6">
                <PlanSelector
                  selectedPlan={selectedPlan}
                  onPlanSelect={setSelectedPlan}
                  billingPeriod={billingPeriod}
                  onBillingPeriodChange={setBillingPeriod}
                  disabled={processingPlan}
                />

                <div className="flex gap-3">
                  <Button
                    onClick={handlePlanChange}
                    disabled={!selectedPlan || processingPlan}
                    className="flex items-center gap-2"
                  >
                    {processingPlan ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Procesando...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        {!organization.stripe_subscription_id || subscriptionDetails?.status === "canceled"
                          ? "Reactivar Suscripción"
                          : "Actualizar Plan"}
                      </>
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowPlanSelector(false)
                      setSelectedPlan(null)
                    }}
                    disabled={processingPlan}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Gestión de Plan</h3>
                <Button onClick={() => setShowPlanSelector(true)} className="flex items-center gap-2">
                  <Edit className="h-4 w-4" />
                  {!organization.stripe_subscription_id || subscriptionDetails?.status === "canceled"
                    ? "Reactivar Suscripción"
                    : "Cambiar Plan"}
                </Button>
              </div>

              {!organization.stripe_subscription_id || subscriptionDetails?.status === "canceled" ? (
                <Alert className="border-blue-500 bg-blue-50">
                  <Info className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    No tienes una suscripción activa. Puedes reactivar tu suscripción seleccionando un plan.
                  </AlertDescription>
                </Alert>
              ) : (
                <p className="text-gray-600">
                  Puedes cambiar tu plan actual en cualquier momento. Los cambios se aplicarán inmediatamente con
                  prorrateo.
                </p>
              )}
            </div>
          )}

          {loadingSubscriptionDetails ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">Cargando detalles de suscripción...</p>
              </div>
            </div>
          ) : subscriptionDetails ? (
            <div className="space-y-6">
              {getSubscriptionMessage(subscriptionDetails)}

              <div className="bg-white border rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Detalles de Suscripción</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <strong>Estado:</strong> {getSubscriptionStatus(organization)}
                  </div>
                  {subscriptionDetails.plan && (
                    <div>
                      <strong>Plan:</strong> {subscriptionDetails.plan}
                      {subscriptionDetails.amount && subscriptionDetails.interval && (
                        <span>
                          {" "}
                          - €{(subscriptionDetails.amount / 100).toFixed(2)}/{subscriptionDetails.interval}
                        </span>
                      )}
                    </div>
                  )}
                  {subscriptionDetails.current_period_start && subscriptionDetails.current_period_end && (
                    <>
                      <div>
                        <strong>Período actual:</strong> {formatDate(subscriptionDetails.current_period_start)} -{" "}
                        {formatDate(subscriptionDetails.current_period_end)}
                      </div>
                    </>
                  )}
                  {subscriptionDetails.trial_start && subscriptionDetails.trial_end && (
                    <>
                      <div>
                        <strong>Período de prueba:</strong> {formatDate(subscriptionDetails.trial_start)} -{" "}
                        {formatDate(subscriptionDetails.trial_end)}
                      </div>
                    </>
                  )}
                  {subscriptionDetails.access_until && (
                    <div>
                      <strong>Acceso hasta:</strong> {formatDate(subscriptionDetails.access_until)}
                    </div>
                  )}
                </div>
              </div>

              {subscriptionDetails.payment_method && (
                <div className="bg-white border rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Método de Pago
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {subscriptionDetails.payment_method.brand && subscriptionDetails.payment_method.last4 && (
                      <div>
                        <strong>Tarjeta:</strong>{" "}
                        <span className="capitalize">{subscriptionDetails.payment_method.brand}</span> terminada en{" "}
                        {subscriptionDetails.payment_method.last4}
                      </div>
                    )}
                    {subscriptionDetails.payment_method.exp_month && subscriptionDetails.payment_method.exp_year && (
                      <div>
                        <strong>Vencimiento:</strong>{" "}
                        {subscriptionDetails.payment_method.exp_month.toString().padStart(2, "0")}/
                        {subscriptionDetails.payment_method.exp_year}
                      </div>
                    )}
                    {subscriptionDetails.payment_method.type && !subscriptionDetails.payment_method.brand && (
                      <div>
                        <strong>Tipo:</strong>{" "}
                        <span className="capitalize">{subscriptionDetails.payment_method.type}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {organization.stripe_subscription_id &&
                subscriptionDetails.status !== "canceled" &&
                !subscriptionDetails.cancel_at_period_end && (
                  <div className="bg-white border rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">Acciones de Suscripción</h3>

                    {!showUpdatePayment ? (
                      <div className="flex flex-col sm:flex-row gap-4">
                        <Button onClick={() => setShowUpdatePayment(true)} className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4" />
                          Actualizar Método de Pago
                        </Button>

                        <Button
                          variant="destructive"
                          onClick={handleCancelSubscription}
                          disabled={cancelingSubscription}
                          className="flex items-center gap-2"
                        >
                          <XCircle className="h-4 w-4" />
                          {cancelingSubscription ? "Cancelando..." : "Cancelar Suscripción"}
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <h4 className="font-medium">Actualizar Método de Pago</h4>
                        <Elements stripe={stripePromise}>
                          <UpdatePaymentForm onSuccess={handleUpdatePaymentSuccess} />
                        </Elements>
                      </div>
                    )}
                  </div>
                )}
            </div>
          ) : organization.stripe_subscription_id ? (
            <Alert className="border-red-500 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                Error cargando los detalles de la suscripción. Por favor, inténtalo de nuevo.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="border-gray-500 bg-gray-50">
              <Info className="h-4 w-4 text-gray-600" />
              <AlertDescription className="text-gray-800">
                Esta organización no tiene una suscripción activa.
              </AlertDescription>
            </Alert>
          )}

          <div className="bg-white border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Información Importante</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p>• Al cancelar la suscripción, tendrás acceso hasta el final del período actual.</p>
              <p>• Los cambios en el método de pago se aplicarán inmediatamente.</p>
              <p>• Los cambios de plan se aplican con prorrateo inmediato.</p>
              <p>• Las suscripciones canceladas se pueden reactivar seleccionando un nuevo plan.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
