"use client"

import { Sidebar } from "@/components/sidebar"
import { DashboardContent } from "@/components/dashboard-content"
import { MobileHeader } from "@/components/mobile-header"
import Head from "next/head"

export default function DashboardPage() {
  return (
    <div className="flex h-screen bg-background">
      <Head>
        <title>Dashboard - GloryHouseCoop</title>
      </Head>
      <Sidebar />
      <MobileHeader title="Dashboard" showBack={false} />
      <DashboardContent />
    </div>
  )
}
