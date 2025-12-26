"use client"

import { Card } from "@/components/ui/card"
import { PieChart, Pie, Cell, Legend, ResponsiveContainer } from "recharts"

const data = [
  { name: "Active", value: 31, color: "#7d6b2e" },
  { name: "Overdue", value: 4, color: "#dc2626" },
  { name: "Pending", value: 10, color: "#3b82f6" },
  { name: "Closed", value: 56, color: "#7c3aed" },
]

export function LoanStatusChart() {
  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold text-foreground mb-6">Loan Status Distribution</h2>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value">
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  )
}
