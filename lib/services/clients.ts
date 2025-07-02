import { supabase } from "@/lib/supabase/client"
import type { Client, ClientInsert, ClientUpdate } from "@/types/calendar"

export class ClientService {
  // Obtener todos los clientes
  static async getClients(): Promise<Client[]> {
    const { data, error } = await supabase.from("clients").select("*").order("name")

    if (error) {
      console.error("Error fetching clients:", error)
      throw error
    }

    return data
  }

  // Buscar clientes
  static async searchClients(searchTerm: string): Promise<Client[]> {
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
      .order("name")
      .limit(10)

    if (error) {
      console.error("Error searching clients:", error)
      throw error
    }

    return data
  }

  // Crear cliente
  static async createClient(client: ClientInsert): Promise<Client> {
    const { data, error } = await supabase.from("clients").insert(client).select().single()

    if (error) {
      console.error("Error creating client:", error)
      throw error
    }

    return data
  }

  // Actualizar cliente
  static async updateClient(id: number, updates: ClientUpdate): Promise<Client> {
    const { data, error } = await supabase.from("clients").update(updates).eq("id", id).select().single()

    if (error) {
      console.error("Error updating client:", error)
      throw error
    }

    return data
  }

  // Eliminar cliente
  static async deleteClient(id: number): Promise<void> {
    const { error } = await supabase.from("clients").delete().eq("id", id)

    if (error) {
      console.error("Error deleting client:", error)
      throw error
    }
  }
}
