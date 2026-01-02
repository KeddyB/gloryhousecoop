"use client"

import { useEffect, useState } from "react"
import { KpiCard } from "@/components/kpi-card"
import { InterestFeeChart } from "@/components/interest-fee-chart"
import { LoanStatusChart } from "@/components/loan-status-chart"
import { RecentTransactions } from "@/components/recent-transactions"
import { NewApplications } from "@/components/new-applications"
import { QuickActions } from "@/components/quick-actions"
import { createClient } from "@/utils/supabase/client"

import { Skeleton } from "@/components/ui/skeleton"

export function DashboardContent() {
  const [totalMembers, setTotalMembers] = useState("...")
  const [newMembersText, setNewMembersText] = useState("...")
  const [activeLoansCount, setActiveLoansCount] = useState("...")
  const [totalInterest, setTotalInterest] = useState("...")
  const [totalProfit, setTotalProfit] = useState("...")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true)
      const supabase = createClient()
      
      // Get total members
      const { count: totalCount } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
      
      if (totalCount !== null) {
        setTotalMembers(totalCount.toString())
      }

      // Get new members this month
      const now = new Date()
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      
      const { count: newCount } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', firstDayOfMonth)

      if (newCount !== null) {
        setNewMembersText(`+${newCount} new this month`)
      }

      // Get Active Loans Count (active or disbursed)
      const { count: loansCount } = await supabase
        .from('loans')
        .select('*', { count: 'exact', head: true })
        .or('state.eq.active,state.eq.disbursed')

      if (loansCount !== null) {
        setActiveLoansCount(loansCount.toString())
      }

      // Get Total Interest Paid
      const { data: interestData } = await supabase
        .from('interest_payments')
        .select('amount_paid')
      
      const interestSum = interestData?.reduce((sum, item) => sum + (Number(item.amount_paid) || 0), 0) || 0
      setTotalInterest(`₦${interestSum.toLocaleString()}`)

      // Get Total Repayments
      const { data: repaymentData } = await supabase
        .from('repayments')
        .select('amount_paid')
      
      const repaymentSum = repaymentData?.reduce((sum, item) => sum + (Number(item.amount_paid) || 0), 0) || 0

      // Get Total Disbursed (Loans that are not pending/rejected)
      // We assume loans that are not pending or rejected are disbursed/active/closed
      const { data: loanData } = await supabase
        .from('loans')
        .select('loan_amount')
        .not('state', 'eq', 'pending')
        .not('state', 'eq', 'rejected')
        .not('state', 'eq', 'cancelled')

      const disbursedSum = loanData?.reduce((sum, item) => sum + (Number(item.loan_amount) || 0), 0) || 0

      // Profit = (Interest + Repayments) - Disbursed
      const profit = (interestSum + repaymentSum) - disbursedSum
      setTotalProfit(`₦${profit.toLocaleString()}`)
      setLoading(false)
    }

    fetchStats()
  }, [])

  if (loading) {
    return (
      <main className="flex-1 overflow-y-auto bg-background">
        <div className="p-4 md:p-8">
          {/* Header Skeleton */}
          <div className="flex justify-between items-start mb-6 md:mb-8 pt-12 md:pt-0">
            <div>
              <Skeleton className="h-8 w-40 mb-2 md:h-9 md:w-48" />
              <Skeleton className="h-4 w-48 md:h-5 md:w-64" />
            </div>
          </div>

          {/* KPI Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
            <Skeleton className="h-[126px] w-full" />
            <Skeleton className="h-[126px] w-full" />
            <Skeleton className="h-[126px] w-full" />
            <Skeleton className="h-[126px] w-full" />
          </div>

          {/* Charts Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
            <Skeleton className="h-[350px] w-full" />
            <Skeleton className="h-[350px] w-full" />
          </div>

          {/* Transactions and Applications Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
            <Skeleton className="h-[400px] w-full" />
            <Skeleton className="h-[400px] w-full" />
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="flex-1 overflow-y-auto bg-background">
      <div className="p-4 md:p-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-6 md:mb-8 pt-12 md:pt-0">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Dashboard</h1>
            <p className="text-sm md:text-base text-muted-foreground">Welcome back, Here&apos;s your society overview</p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
          <KpiCard title="Total Members" value={totalMembers} change={newMembersText} icon="users" loading={loading} />
          <KpiCard title="Interest Monthly Fees" value={totalInterest} change="Total collected" icon="wallet" loading={loading} />
          <KpiCard title="Active Loans" value={activeLoansCount} change="Currently active loans" icon="briefcase" loading={loading} />
          <KpiCard title="Total Profit" value={totalProfit} change="Net cash flow" icon="trending" loading={loading} />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
          <InterestFeeChart />
          <LoanStatusChart />
        </div>

        {/* Transactions and Applications */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
          <RecentTransactions />
          <NewApplications />
        </div>

        {/* Quick Actions */}
        <QuickActions />
      </div>
    </main>
  )
}