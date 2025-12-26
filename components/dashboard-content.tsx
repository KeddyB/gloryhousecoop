"use client"

import { KpiCard } from "@/components/kpi-card"
import { InterestFeeChart } from "@/components/interest-fee-chart"
import { LoanStatusChart } from "@/components/loan-status-chart"
import { RecentTransactions } from "@/components/recent-transactions"
import { NewApplications } from "@/components/new-applications"
import { QuickActions } from "@/components/quick-actions"
import { Calendar } from "lucide-react"

export function DashboardContent() {
  return (
    <main className="flex-1 overflow-y-auto bg-background">
      <div className="p-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, Here's your society overview</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            Last Updated : 15th December 2025
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          <KpiCard title="Total Members" value="120" change="+12 new this month" icon="users" />
          <KpiCard title="Interest Monthly Fees" value="N154,600" change="+16% from last month" icon="wallet" />
          <KpiCard title="Active Loans" value="25" change="12.5M total amount" icon="briefcase" />
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
