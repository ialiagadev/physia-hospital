"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/app/contexts/auth-context"
import type { Expense, ExpenseFilters } from "@/types/expenses"

export interface ExpenseWithUser extends Expense {
  user?: {
    id: string
    name: string
    email: string
    type?: number
  } | null
  creator?: {
    id: string
    name: string
    email: string
    type?: number
  } | null
}

export function useExpenses(filters?: ExpenseFilters) {
  const { userProfile } = useAuth()
  const [expenses, setExpenses] = useState<ExpenseWithUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchExpenses = async () => {
    if (!userProfile?.organization_id) return

    try {
      setLoading(true)
      setError(null)

      // Obtener gastos
      let query = supabase
        .from("expenses")
        .select("*")
        .eq("organization_id", userProfile.organization_id)
        .order("expense_date", { ascending: false })

      // Aplicar filtros
      if (filters?.user_id && filters.user_id !== "all" && filters.user_id !== "") {
        query = query.eq("user_id", filters.user_id)
      }
      if (filters?.status && filters.status !== "all") {
        query = query.eq("status", filters.status)
      }
      if (filters?.date_from) {
        query = query.gte("expense_date", filters.date_from)
      }
      if (filters?.date_to) {
        query = query.lte("expense_date", filters.date_to)
      }
      if (filters?.min_amount) {
        query = query.gte("amount", filters.min_amount)
      }
      if (filters?.max_amount) {
        query = query.lte("amount", filters.max_amount)
      }
      if (filters?.search && filters.search.trim() !== "") {
        query = query.or(
          `description.ilike.%${filters.search}%,supplier_name.ilike.%${filters.search}%,notes.ilike.%${filters.search}%`,
        )
      }

      const { data: expensesData, error } = await query

      if (error) throw error

      // Obtener usuarios relacionados
      const userIds = [
        ...new Set([
          ...expensesData.map((e) => e.user_id).filter(Boolean),
          ...expensesData.map((e) => e.created_by).filter(Boolean),
        ]),
      ]

      let usersData: any[] = []
      if (userIds.length > 0) {
        const { data: users, error: usersError } = await supabase
          .from("users")
          .select("id, name, email, type")
          .in("id", userIds)

        if (usersError) {
          console.error("Error fetching users:", usersError)
        } else {
          usersData = users || []
        }
      }

      // Combinar datos
      const expensesWithDetails = expensesData.map((expense) => ({
        ...expense,
        user: expense.user_id ? usersData.find((u) => u.id === expense.user_id) || null : null,
        creator: expense.created_by ? usersData.find((u) => u.id === expense.created_by) || null : null,
      }))

      setExpenses(expensesWithDetails)
    } catch (err) {
      console.error("Error fetching expenses:", err)
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }

  const createExpense = async (expenseData: any) => {
    if (!userProfile?.organization_id || !userProfile?.id) return

    try {
      const insertData: any = {
        organization_id: userProfile.organization_id,
        description: expenseData.description,
        amount: expenseData.amount,
        expense_date: expenseData.expense_date,
        created_by: userProfile.id,
        status: "pending",
        vat_rate: expenseData.vat_rate || 21,
        vat_amount: expenseData.vat_amount || 0,
        retention_rate: expenseData.retention_rate || 0,
        retention_amount: expenseData.retention_amount || 0,
        is_deductible: expenseData.is_deductible || false,
      }

      // Campos opcionales
      if (expenseData.user_id && expenseData.user_id !== "none") {
        insertData.user_id = expenseData.user_id
      }
      if (expenseData.notes) {
        insertData.notes = expenseData.notes
      }
      if (expenseData.payment_method && expenseData.payment_method !== "none") {
        insertData.payment_method = expenseData.payment_method
      }
      if (expenseData.supplier_name) {
        insertData.supplier_name = expenseData.supplier_name
      }
      if (expenseData.supplier_tax_id) {
        insertData.supplier_tax_id = expenseData.supplier_tax_id
      }
      if (expenseData.receipt_path) {
        insertData.receipt_path = expenseData.receipt_path
      }
      if (expenseData.receipt_url) {
        insertData.receipt_url = expenseData.receipt_url
      }

      const { data, error } = await supabase.from("expenses").insert(insertData).select().single()

      if (error) throw error

      await fetchExpenses()
      return data
    } catch (err) {
      console.error("Error creating expense:", err)
      throw err
    }
  }

  const updateExpense = async (id: number, expenseData: any) => {
    try {
      const { data, error } = await supabase.from("expenses").update(expenseData).eq("id", id).select().single()

      if (error) throw error

      await fetchExpenses()
      return data
    } catch (err) {
      console.error("Error updating expense:", err)
      throw err
    }
  }

  const deleteExpense = async (id: number) => {
    try {
      const { error } = await supabase.from("expenses").delete().eq("id", id)

      if (error) throw error

      await fetchExpenses()
    } catch (err) {
      console.error("Error deleting expense:", err)
      throw err
    }
  }

  const updateExpenseStatus = async (id: number, status: Expense["status"]) => {
    try {
      const { data, error } = await supabase.from("expenses").update({ status }).eq("id", id).select().single()

      if (error) throw error

      await fetchExpenses()
      return data
    } catch (err) {
      console.error("Error updating expense status:", err)
      throw err
    }
  }

  useEffect(() => {
    fetchExpenses()
  }, [userProfile?.organization_id, filters])

  return {
    expenses,
    loading,
    error,
    refetch: fetchExpenses,
    createExpense,
    updateExpense,
    deleteExpense,
    updateExpenseStatus,
  }
}
