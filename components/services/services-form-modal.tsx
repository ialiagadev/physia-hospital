"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ServiceForm } from "./service-form"
import type { Service } from "@/types/services"

interface ServiceFormModalProps {
  organizationId: number
  service?: Service | null
  onClose: () => void
  onSuccess: () => void
}

export function ServiceFormModal({ organizationId, service, onClose, onSuccess }: ServiceFormModalProps) {
  const handleSuccess = () => {
    onSuccess()
    onClose()
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{service ? "Editar Servicio" : "Nuevo Servicio"}</DialogTitle>
          <DialogDescription>
            {service ? "Modifica los datos del servicio" : "Introduce los datos del nuevo servicio"}
          </DialogDescription>
        </DialogHeader>

        <ServiceForm organizationId={organizationId} service={service} onSuccess={handleSuccess} onCancel={onClose} />
      </DialogContent>
    </Dialog>
  )
}
