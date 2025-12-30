"use client"

import { useEffect, useState } from "react"
import { KpiCard } from "@/components/kpi-card"
import { InterestFeeChart } from "@/components/interest-fee-chart"
import { LoanStatusChart } from "@/components/loan-status-chart"
import { RecentTransactions } from "@/components/recent-transactions"
import { NewApplications } from "@/components/new-applications"
import { QuickActions } from "@/components/quick-actions"
import { createClient } from "@/utils/supabase/client"

export function DashboardContent() {
  const [totalMembers, setTotalMembers] = useState("...")
  const [newMembersText, setNewMembersText] = useState("...")
  const [activeMembers, setActiveMembers] = useState("...")
  
  useEffect(() => {
    const fetchStats = async () => {
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

      // Get active members count
      const { count: activeCount } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')

      if (activeCount !== null) {
        setActiveMembers(activeCount.toString())
      }
    }

    fetchStats()
  }, [])

  return (
    <main className="flex-1 overflow-y-auto bg-background">
      <div className="p-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, Here's your society overview</p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          <KpiCard title="Total Members" value={totalMembers} change={newMembersText} icon="users" />
          <KpiCard title="Interest Monthly Fees" value="N154,600" change="+16% from last month" icon="wallet" />
          <KpiCard title="Active Loans" value={activeMembers} change="Members with active status" icon="briefcase" />
          <KpiCard title="Total Profit" value="N1.25M" change="+22% this month" icon="trending" />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <InterestFeeChart />
          <LoanStatusChart />
        </div>

        {/* Transactions and Applications */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <RecentTransactions />
          <NewApplications />
        </div>

        {/* Quick Actions */}
        <QuickActions />
      </div>
    </main>
  )
}
