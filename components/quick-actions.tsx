import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, DollarSign, Briefcase } from "lucide-react"
import Link from "next/link"

const actions = [
  {
    icon: Users,
    label: "Add Member",
    description: "Register new member",
    href: "/members/add",
  },
  {
    icon: DollarSign,
    label: "Collect Interest",
    description: "Collect monthly fees",
    href: "/fees/entry",
  },
  {
    icon: Briefcase,
    label: "New loan",
    description: "Create new loan",
    href: "/loans/applications",
  },
]

export function QuickActions() {
  return (
      <Card className="p-4 md:p-6">
        <h2 className="text-base md:text-lg font-semibold text-foreground mb-4 md:mb-6">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
        {actions.map((action, idx) => {
          const Icon = action.icon
          return (
            <Link key={idx} href={action.href} passHref>
              <Button
                variant="outline"
                className="h-20 md:h-24 w-full flex flex-col items-center justify-center gap-2 bg-transparent"
              >
                <Icon className="h-5 md:h-6 w-5 md:w-6" />
                <span className="text-xs md:text-sm font-medium text-center">{action.label}</span>
              </Button>
            </Link>
          )
        })}
        </div>
      </Card>
  )
}
