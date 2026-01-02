"use client"

import { Card } from "@/components/ui/card"
import { createClient } from "@/utils/supabase/client"
import { useEffect, useState } from "react"
import { format } from "date-fns"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface Transaction {
  id: string
  title: string
  name: string
  amount: number
  status: string
  date: string
  created_at: string
  type: 'disbursement' | 'repayment' | 'interest'
}

export function RecentTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchTransactions = async () => {
      const supabase = createClient()
      
      // Fetch disbursements
      const { data: disbursements, error: disbursementError } = await supabase
        .from('disbursements')
        .select(`
          *,
          loan:loans(
            *,
            member:members(*)
          )
        `)
        .order('created_at', { ascending: false })
        .limit(20)

      // Fetch repayments
      // Use updated_at for ordering as requested
      const { data: repayments, error: repaymentError } = await supabase
        .from('repayments')
        .select(`
          *,
          loan:loans(
            *,
            member:members(*)
          )
        `)
        .order('updated_at', { ascending: false })
        .limit(20)

      // Fetch interest payments
      const { data: interestPayments, error: interestError } = await supabase
        .from('interest_payments')
        .select(`
            *,
            loan:loans (
                *,
                member:members (*)
            )
        `)
        .order('created_at', { ascending: false })
        .limit(20)

      if (disbursementError) console.error("Error fetching disbursements:", disbursementError)
      if (repaymentError) console.error("Error fetching repayments:", repaymentError)
      if (interestError) console.error("Error fetching interest payments:", interestError)

      // Process and combine
      const disbursementTransactions: Transaction[] = (disbursements || []).map(d => ({
        id: d.id,
        title: "Loan Disbursement",
        name: d.loan?.member?.full_name || d.loan?.member?.name || "Unknown Member",
        amount: d.disbursement_amount,
        status: "Completed",
        date: d.created_at,
        created_at: d.created_at,
        type: 'disbursement'
      }))

      const repaymentTransactions: Transaction[] = (repayments || []).map(r => ({
        id: r.id,
        title: "Loan Repayment",
        name: r.loan?.member?.full_name || r.loan?.member?.name || "Unknown Member",
        amount: r.amount_paid,
        status: "Completed",
        // Use updated_at as primary date source
        date: r.updated_at || r.paid_at || r.created_at || new Date().toISOString(),
        created_at: r.updated_at || r.paid_at || r.created_at || new Date().toISOString(),
        type: 'repayment'
      }))

      const interestTransactions: Transaction[] = (interestPayments || []).map(i => ({
        id: i.id,
        title: "Interest Payment",
        name: i.loan?.member?.full_name || i.loan?.member?.name || "Unknown Member",
        amount: i.amount_paid,
        status: "Completed",
        date: i.created_at || new Date().toISOString(),
        created_at: i.created_at || new Date().toISOString(),
        type: 'interest'
      }))

      // Combine and sort by created_at (which now holds updated_at for repayments) descending
      const allTransactions = [...disbursementTransactions, ...repaymentTransactions, ...interestTransactions]
        .filter(t => t.amount > 0)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 6) // Take top 6

      setTransactions(allTransactions)
      setIsLoading(false)
    }

    fetchTransactions()
  }, [])

  if (isLoading) {
    return (
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-foreground mb-6">Recent Transactions</h2>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold text-foreground mb-6">Recent Transactions</h2>
      {transactions.length === 0 ? (
         <p className="text-muted-foreground text-sm">No recent transactions found.</p>
      ) : (
        <div className="space-y-4">
          {transactions.map((transaction) => (
            <div
              key={transaction.id}
              className="flex items-center justify-between p-4 bg-background rounded-lg border border-border"
            >
              <div className="flex items-center gap-4">
                <Avatar className="h-10 w-10">
                   <AvatarFallback>{transaction.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-semibold text-foreground">{transaction.name}</p>
                  <p className="text-xs text-muted-foreground">{transaction.title} • {format(new Date(transaction.date), 'MMM d, yyyy')}</p>
                </div>
              </div>
              <div className="text-right flex items-center">
                <p className={`text-sm font-semibold ${transaction.type === 'disbursement' ? 'text-red-500' : 'text-green-600'}`}>
                   {transaction.type === 'disbursement' ? '-' : '+'}
                   ₦{transaction.amount.toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
