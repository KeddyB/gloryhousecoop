import { Card } from "@/components/ui/card"
import { Users, Wallet, Briefcase, TrendingUp, ArrowUp } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

interface KpiCardProps {
  title: string
  value: string
  change: string
  icon: "users" | "wallet" | "briefcase" | "trending"
  loading?: boolean
}

export function KpiCard({ title, value, change, icon, loading }: KpiCardProps) {
  const iconMap = {
    users: <Users className="h-6 w-6 text-muted-foreground" />,
    wallet: <Wallet className="h-6 w-6 text-muted-foreground" />,
    briefcase: <Briefcase className="h-6 w-6 text-muted-foreground" />,
    trending: <TrendingUp className="h-6 w-6 text-muted-foreground" />,
  }

  return (
      <Card className="p-4 md:p-6">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xs md:text-sm font-medium text-muted-foreground line-clamp-2">{title}</h3>
        <div className="ml-2">{iconMap[icon]}</div>
      </div>
      <div className="mb-2">
        {loading ? (
          <Skeleton className="h-8 w-3/4" />
        ) : (
          <p className="text-2xl md:text-3xl font-bold text-foreground truncate">{value}</p>
        )}
      </div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        {loading ? (
          <Skeleton className="h-4 w-1/2" />
        ) : (
          <>
            <ArrowUp className="h-3 w-3" />
            <span className="truncate">{change}</span>
          </>
        )}
      </div>
      </Card>
  )
}
