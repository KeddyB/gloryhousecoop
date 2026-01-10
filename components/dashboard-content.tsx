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
      const now = new Date() // Declared once here
      
      // Get total members
      const { count: totalCount } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
      
      if (totalCount !== null) {
        setTotalMembers(totalCount.toString())
      }

      // Get new members this month
      const firstDayOfMonthForNewMembers = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      
      const { count: newCount } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', firstDayOfMonthForNewMembers)

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

      // Get Total Interest Paid this month
      const firstDayOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDayOfThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const { data: interestData } = await supabase
        .from('interest_payments')
        .select('amount_paid')
        .gte('payment_for_month', firstDayOfThisMonth.toISOString().slice(0, 10))
        .lte('payment_for_month', lastDayOfThisMonth.toISOString().slice(0, 10));

      const interestSum = interestData?.reduce((sum, item) => sum + (Number(item.amount_paid) || 0), 0) || 0;
      setTotalInterest(`₦${interestSum.toLocaleString()}`);

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

      // Calculate Total Profit Expected (Monthly interest expected for the current month)
      const { data: allLoansDataWithDates, error: allLoansWithDatesError } = await supabase
        .from('loans')
        .select('loan_amount, interest_rate, created_at, disbursements(created_at), tenure')
        .or('state.eq.active,state.eq.disbursed')

      let expectedMonthlyInterestSum = 0
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1) // Start of the current calendar month

      if (allLoansDataWithDates) {
        allLoansDataWithDates.forEach((loan) => {
          const disbursedDateStr = loan.disbursements?.[0]?.created_at || loan.created_at;
          const loanStartDate = new Date(disbursedDateStr); // Actual start date of the loan

          const loanEndDate = new Date(loanStartDate.getFullYear(), loanStartDate.getMonth() + loan.tenure, loanStartDate.getDate()); // End date of the loan

          // Check if the current month falls within the active period of the loan
          // and if a payment is expected for this specific month
          const firstDayOfLoanMonth = new Date(loanStartDate.getFullYear(), loanStartDate.getMonth(), 1);
          const lastDayOfLoanMonth = new Date(loanStartDate.getFullYear(), loanStartDate.getMonth() + 1, 0);

          if (
              currentMonthStart >= firstDayOfLoanMonth &&
              currentMonthStart <= loanEndDate
          ) {
              const monthlyInterest = (loan.loan_amount * loan.interest_rate) / 100;
              expectedMonthlyInterestSum += monthlyInterest;
          }
        });
      }
      
      setTotalProfit(`₦${expectedMonthlyInterestSum.toLocaleString()}`)
      setLoading(false)
    }

    fetchStats()
  }, [])

  if (loading) {
    return (
      <main className="flex-1 overflow-y-auto bg-background">
        <div className="p-4 pt-[4.5rem] md:p-8">
          {/* Header Skeleton */}
          <div className="hidden md:flex justify-between items-start mb-6 md:mb-8">
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
      <div className="p-4 pt-[4.5rem] md:p-8">
        {/* Header */}
        <div className="hidden md:flex justify-between items-start mb-6 md:mb-8">
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
          <KpiCard title="Total Profit Expected" value={totalProfit} change="Net cash flow" icon="trending" loading={loading} />
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