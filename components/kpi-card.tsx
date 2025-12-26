import { Card } from "@/components/ui/card"
import { Users, Wallet, Briefcase, TrendingUp, ArrowUp } from "lucide-react"

interface KpiCardProps {
  title: string
  value: string
  change: string
  icon: "users" | "wallet" | "briefcase" | "trending"
}

export function KpiCard({ title, value, change, icon }: KpiCardProps) {
  const iconMap = {
    users: <Users className="h-6 w-6 text-muted-foreground" />,
    wallet: <Wallet className="h-6 w-6 text-muted-foreground" />,
    briefcase: <Briefcase className="h-6 w-6 text-muted-foreground" />,
    trending: <TrendingUp className="h-6 w-6 text-muted-foreground" />,
  }

  return (
    <Card className="p-6">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        {iconMap[icon]}
      </div>
      <div className="mb-2">
        <p className="text-3xl font-bold text-foreground">{value}</p>
      </div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <ArrowUp className="h-3 w-3" />
        {change}
      </div>
    </Card>
  )
}
