"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { PieChart, Pie, Cell, Legend, ResponsiveContainer, Tooltip } from "recharts"
import { createClient } from "@/utils/supabase/client"
import { isBefore } from "date-fns"

export function LoanStatusChart() {
  const [data, setData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()
      
      // 1. Active: Total active users (Members)
      const { count: activeCount } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')

      // 2. Closed: Members with completed payment (Loans closed/paid)
      const { count: closedCount } = await supabase
        .from('loans')
        .select('*', { count: 'exact', head: true })
        .or('state.eq.closed,state.eq.paid')

      // 3. Overdue & Pending: From Repayments
      const { data: repayments } = await supabase
        .from('repayments')
        .select('status, due_date')
        
      let overdueCount = 0
      let pendingCount = 0
      
      const now = new Date()

      repayments?.forEach(r => {
        // "Overdue": Total overdue payments
        if (r.status === 'overdue') {
            overdueCount++
        } else if (r.status === 'pending') {
             // Check if actually overdue by date
             if (r.due_date && isBefore(new Date(r.due_date), now)) {
                 overdueCount++
             } else {
                 // "Pending": Repayments with status set to pending
                 pendingCount++
             }
        }
      })

      setData([
        { name: "Active", value: activeCount || 0, color: "#7d6b2e" },
        { name: "Overdue", value: overdueCount, color: "#dc2626" },
        { name: "Pending", value: pendingCount, color: "#3b82f6" },
        { name: "Closed", value: closedCount || 0, color: "#7c3aed" },
      ])
      setIsLoading(false)
    }

    fetchData()
  }, [])

  if (isLoading) {
      return (
        <Card className="p-6 h-[300px] flex items-center justify-center">
             <div className="h-6 w-6 animate-spin rounded-full border-2 border-black border-t-transparent" />
        </Card>
      )
  }

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold text-foreground mb-6">Loan Status Distribution</h2>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie 
            data={data} 
            cx="50%" 
            cy="50%" 
            innerRadius={60} 
            outerRadius={100} 
            paddingAngle={2} 
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number) => [value, 'Count']} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  )
}
