"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/app/contexts/auth-context"
import type { Expense, ExpenseWithDetails, ExpenseFilters } from "@/types/expenses"

export function useExpenses(filters?: ExpenseFilters) {
  const { userProfile } = useAuth()
  const [expenses, setExpenses] = useState<ExpenseWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchExpenses = async () => {
    if (!userProfile?.organization_id) return

    try {
      setLoading(true)
      setError(null)

      // Primero obtenemos los gastos sin joins
      let query = supabase
        .from("expenses")
        .select("*")
        .eq("organization_id", userProfile.organization_id)
        .order("expense_date", { ascending: false })

      // Apply filters
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

      // Ahora obtenemos los usuarios por separado
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
          .eq("type", 1) // Solo usuarios profesionales

        if (usersError) {
          console.error("Error fetching users:", usersError)
        } else {
          usersData = users || []
        }
      }

      // Combinar los datos
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
      const vat_amount = (expenseData.amount * (expenseData.vat_rate || 0)) / 100

      const insertData: any = {
        organization_id: userProfile.organization_id,
        description: expenseData.description,
        amount: expenseData.amount,
        expense_date: expenseData.expense_date,
        created_by: userProfile.id,
        status: "pending",
        vat_rate: expenseData.vat_rate || 0,
        vat_amount,
        is_deductible: expenseData.is_deductible || false,
      }

      // Solo agregar campos opcionales si tienen valor
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

      const { data, error } = await supabase.from("expenses").insert(insertData).select().single()

      if (error) throw error

      await fetchExpenses() // Refresh the list
      return data
    } catch (err) {
      console.error("Error creating expense:", err)
      throw err
    }
  }

  const updateExpense = async (id: number, expenseData: any) => {
    try {
      const updateData: any = { ...expenseData }

      // Recalculate VAT if amount or rate is updated
      if (expenseData.amount !== undefined || expenseData.vat_rate !== undefined) {
        const amount = expenseData.amount ?? 0
        const vat_rate = expenseData.vat_rate ?? 0
        updateData.vat_amount = (amount * vat_rate) / 100
      }

      const { data, error } = await supabase.from("expenses").update(updateData).eq("id", id).select().single()

      if (error) throw error

      await fetchExpenses() // Refresh the list
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

      await fetchExpenses() // Refresh the list
    } catch (err) {
      console.error("Error deleting expense:", err)
      throw err
    }
  }

  const updateExpenseStatus = async (id: number, status: Expense["status"]) => {
    try {
      const { data, error } = await supabase.from("expenses").update({ status }).eq("id", id).select().single()

      if (error) throw error

      await fetchExpenses() // Refresh the list
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
