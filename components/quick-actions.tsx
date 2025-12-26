import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, DollarSign, Briefcase } from "lucide-react"

const actions = [
  {
    icon: Users,
    label: "Add Member",
    description: "Register new member",
  },
  {
    icon: DollarSign,
    label: "Collect Interest",
    description: "Collect monthly fees",
  },
  {
    icon: Briefcase,
    label: "New loan",
    description: "Create new loan",
  },
]

export function QuickActions() {
  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold text-foreground mb-6">Quick Actions</h2>
      <div className="grid grid-cols-3 gap-6">
        {actions.map((action, idx) => {
          const Icon = action.icon
          return (
            <Button
              key={idx}
              variant="outline"
              className="h-24 flex flex-col items-center justify-center gap-2 bg-transparent"
            >
              <Icon className="h-6 w-6" />
              <span className="text-sm font-medium">{action.label}</span>
            </Button>
          )
        })}
      </div>
    </Card>
  )
}
