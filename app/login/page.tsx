"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Image from "next/image"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError(error.message)
        return
      }

      if (data.user) {
        console.log("Login exitoso:", data.user.email)
        router.push("/dashboard")
      }
    } catch (err: any) {
      setError("Error inesperado: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl w-full">
        <div className="flex items-center justify-center lg:justify-between lg:gap-16 xl:gap-24">
          {/* Left Side - Login Form */}
          <div className="w-full max-w-md">
            {/* Logo centrado arriba */}
            <div className="flex justify-center mb-8">
              <Image
                src="/images/physia-logo.png"
                alt="PHYSIA Logo"
                width={100}
                height={100}
                className="w-20 h-20 lg:w-24 lg:h-24"
                priority
              />
            </div>

            <div className="mb-8 text-center">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Sign in</h1>
              <p className="text-gray-600 text-sm">Welcome back to PHYSIA Medical System</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <Label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full h-12 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
                  placeholder=""
                />
              </div>

              <div>
                <Label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full h-12 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
                  placeholder=""
                />
              </div>

              <div className="text-left">
                <a href="#" className="text-sm text-purple-600 hover:text-purple-700 font-medium">
                  Forgot password?
                </a>
              </div>

              {error && (
                <Alert variant="destructive" className="border-red-200 bg-red-50">
                  <AlertDescription className="text-red-700">{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors duration-200"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Signing in...
                  </div>
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{" "}
                <a href="/register" className="text-purple-600 hover:text-purple-700 font-medium">
                  Sign up
                </a>
              </p>
            </div>
          </div>

          {/* Right Side - Illustration */}
          <div className="hidden lg:block lg:flex-shrink-0">
            <div className="flex justify-center items-center">
              <Image
                src="/images/medical-ai-illustration.png"
                alt="Medical AI System Illustration"
                width={450}
                height={450}
                className="w-full max-w-md h-auto"
                priority
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
