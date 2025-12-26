"use client"

import { Sidebar } from "@/components/sidebar"

export default function LoansDashboardPage() {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 p-8">
        <h1 className="text-3xl font-bold mb-4">Loans Dashboard</h1>
        <p className="text-muted-foreground">Loans dashboard page placeholder content</p>
      </div>
    </div>
  )
}
