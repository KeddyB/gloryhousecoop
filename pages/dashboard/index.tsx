"use client"

import { Sidebar } from "@/components/sidebar"
import { DashboardContent } from "@/components/dashboard-content"
import { MobileHeader } from "@/components/mobile-header"
import { useRouter } from "next/navigation"

export default function DashboardPage() {
  const router = useRouter();
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <MobileHeader title="Dashboard" showBack={false} />
      <DashboardContent />
    </div>
  )
}
