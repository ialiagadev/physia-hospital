"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Check, ChevronsUpDown, User, Shield, Eye } from "lucide-react"
import { cn } from "@/lib/utils"

interface OrganizationUser {
  id: string
  name: string | null
  email: string | null
  role: string | null // 'admin' | 'user' | 'viewer'
  organization_id: number | null // ✅ AGREGADO
  created_at: string
}

interface UserSelectorProps {
  users: OrganizationUser[]
  selectedUser: OrganizationUser | null
  onSelectUser: (user: OrganizationUser) => void
  currentUserId: string
}

export function UserSelector({ users, selectedUser, onSelectUser, currentUserId }: UserSelectorProps) {
  const [open, setOpen] = useState(false)

  // Filtrar solo usuarios que pueden fichar (admin y user, no viewer)
  const fichableUsers = users.filter((user) => user.role === "admin" || user.role === "user")

  if (fichableUsers.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No hay empleados disponibles para fichar</p>
      </div>
    )
  }

  const getRoleBadge = (role: string | null) => {
    switch (role) {
      case "admin":
        return (
          <Badge variant="secondary" className="text-xs">
            <Shield className="h-3 w-3 mr-1" />
            Admin
          </Badge>
        )
      case "viewer":
        return (
          <Badge variant="outline" className="text-xs">
            <Eye className="h-3 w-3 mr-1" />
            Viewer
          </Badge>
        )
      case "user":
      default:
        return (
          <Badge variant="default" className="text-xs">
            Usuario
          </Badge>
        )
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between h-auto p-3">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <div className="text-left">
              {selectedUser ? (
                <div>
                  <div className="font-medium">{selectedUser.name || "Sin nombre"}</div>
                  <div className="text-xs text-muted-foreground">{selectedUser.email}</div>
                </div>
              ) : (
                <span className="text-muted-foreground">Seleccionar empleado...</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {selectedUser?.role && getRoleBadge(selectedUser.role)}
            {selectedUser?.id === currentUserId && (
              <Badge variant="default" className="text-xs">
                Tú
              </Badge>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar empleado..." className="h-9" />
          <CommandList>
            <CommandEmpty>No se encontraron empleados.</CommandEmpty>
            <CommandGroup>
              {fichableUsers.map((user) => (
                <CommandItem
                  key={user.id}
                  value={`${user.name} ${user.email}`}
                  onSelect={() => {
                    onSelectUser(user)
                    setOpen(false)
                  }}
                  className="flex items-center justify-between p-3"
                >
                  <div className="flex items-center gap-2">
                    <Check className={cn("h-4 w-4", selectedUser?.id === user.id ? "opacity-100" : "opacity-0")} />
                    <div>
                      <div className="font-medium">{user.name || "Sin nombre"}</div>
                      <div className="text-xs text-muted-foreground">{user.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {user.role && getRoleBadge(user.role)}
                    {user.id === currentUserId && (
                      <Badge variant="default" className="text-xs">
                        Tú
                      </Badge>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
