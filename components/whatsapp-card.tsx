"use client"

import { MessageCircle, CheckCircle, ArrowRight } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export default function WhatsAppCard() {
  return (
    <div className="max-w-md mx-auto p-4">
      <Card className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-green-50 to-emerald-50">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center shadow-lg">
                  <MessageCircle className="w-6 h-6 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white"></div>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">WhatsApp</h3>
                <p className="text-sm text-gray-600">Mensajería instantánea</p>
              </div>
            </div>
            <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100">
              <CheckCircle className="w-3 h-3 mr-1" />
              Activo
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="pt-2">
          <Button className="w-full bg-green-500 hover:bg-green-600 text-white shadow-md hover:shadow-lg transition-all duration-200">
            Gestionar canal
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
