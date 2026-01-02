"use client"

import { Card } from "@/components/ui/card"
import { createClient } from "@/utils/supabase/client"
import { useCallback, useEffect, useState } from "react"
import { format } from "date-fns"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

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
  const [disbursementErrorState, setDisbursementErrorState] = useState<string | null>(null)
  const [repaymentErrorState, setRepaymentErrorState] = useState<string | null>(null)

  const fetchTransactions = useCallback(async () => {
    setIsLoading(true)
    const supabase = createClient()

    const disbursementPromise = supabase
      .from('disbursements')
      .select(`
        id,
        disbursement_amount,
        created_at,
        loan:loans(
          member:members(
            full_name,
            name
          )
        )
      `)
      .order('created_at', { ascending: false })
      .limit(20)

    const repaymentPromise = supabase
      .from('repayments')
      .select(`
        id,
        amount_paid,
        updated_at,
        paid_at,
        created_at,
        loan:loans(
          member:members(
            full_name,
            name
          )
        )
      `)
      .order('updated_at', { ascending: false })
      .limit(20)

    const interestPaymentPromise = supabase
      .from('interest_payments')
      .select(`
          id,
          amount_paid,
          created_at,
          loan:loans (
              member:members (
                full_name,
                name
              )
          )
      `)
      .order('created_at', { ascending: false })
      .limit(20)

    const [
      { data: disbursements, error: disbursementError },
      { data: repayments, error: repaymentError },
      { data: interestPayments, error: interestError }
    ] = await Promise.all([
      disbursementPromise,
      repaymentPromise,
      interestPaymentPromise
    ])

    // Preserve console errors for dev visibility, but set user-facing state
    if (disbursementError) {
      console.error("Error fetching disbursements:", disbursementError)
      setDisbursementErrorState('Failed to load disbursements')
    } else {
      setDisbursementErrorState(null)
    }

    if (repaymentError) {
      console.error("Error fetching repayments:", repaymentError)
      setRepaymentErrorState('Failed to load repayments')
    } else {
      setRepaymentErrorState(null)
    }

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
  }, [])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  const handleRetry = async () => {
    await fetchTransactions()
  }

  if (isLoading) {
    return (
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-foreground mb-6">Recent Transactions</h2>
        {(disbursementErrorState || repaymentErrorState) && (
          <div role="alert" aria-live="polite" className="mb-4 p-3 rounded bg-red-50 text-red-800 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Issues loading data</p>
              <p className="text-xs">{[disbursementErrorState, repaymentErrorState].filter(Boolean).join(' • ')}</p>
            </div>
            <div>
              <Button size="sm" variant="ghost" onClick={handleRetry}>Retry</Button>
            </div>
          </div>
        )}
        <div className="space-y-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <h2 className="text-base md:text-lg font-semibold text-foreground mb-4 md:mb-6">Recent Transactions</h2>
      {(disbursementErrorState || repaymentErrorState) && (
        <div role="alert" aria-live="polite" className="mb-4 p-2 md:p-3 rounded bg-red-50 text-red-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
          <div>
            <p className="text-xs md:text-sm font-medium">Issues loading data</p>
            <p className="text-xs">{[disbursementErrorState, repaymentErrorState].filter(Boolean).join(' • ')}</p>
          </div>
          <div>
            <Button size="sm" variant="ghost" onClick={handleRetry}>Retry</Button>
          </div>
        </div>
      )}
      {transactions.length === 0 ? (
         <p className="text-muted-foreground text-xs md:text-sm">No recent transactions found.</p>
      ) : (
        <div className="space-y-3 md:space-y-4">
          {transactions.map((transaction) => (
            <div
              key={transaction.id}
              className="flex flex-col md:flex-row md:items-center md:justify-between p-3 md:p-4 bg-background rounded-lg border border-border gap-2"
            >
              <div className="flex items-center gap-3 md:gap-4">
                <Avatar className="h-8 md:h-10 w-8 md:w-10">
                   <AvatarFallback>{transaction.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-xs md:text-sm font-semibold text-foreground truncate">{transaction.name}</p>
                  <p className="text-xs text-muted-foreground">{transaction.title} • {format(new Date(transaction.date), 'MMM d, yyyy')}</p>
                </div>
              </div>
              <div className="text-right flex items-center ml-auto">
                <p className={`text-xs md:text-sm font-semibold ${transaction.type === 'disbursement' ? 'text-red-500' : 'text-green-600'}`}>
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
