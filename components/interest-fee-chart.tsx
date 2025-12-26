"use client"

import { Card } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

const data = [
  { month: "Jan", collected: 50000, target: 50000 },
  { month: "Feb", collected: 200000, target: 150000 },
  { month: "Mar", collected: 100000, target: 150000 },
  { month: "Apr", collected: 80000, target: 150000 },
  { month: "May", collected: 150000, target: 150000 },
  { month: "Jun", collected: 60000, target: 150000 },
]

export function InterestFeeChart() {
  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold text-foreground mb-6">Interest Fee Collection Trend</h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="collected" stroke="#a855f7" name="Collected" strokeWidth={2} dot={{ r: 4 }} />
          <Line type="monotone" dataKey="target" stroke="#86efac" name="Target" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  )
}
