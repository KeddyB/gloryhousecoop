import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

const applications = [
  {
    id: 1,
    type: "Loan Application",
    name: "David",
    date: "10-12-2025",
    amount: "N75,000",
    action: "Review",
  },
  {
    id: 2,
    type: "Loan Application",
    name: "Aminata",
    date: "08-12-2025",
    amount: "N105,000",
    action: "Review",
  },
  {
    id: 3,
    type: "Member Registration",
    name: "Mohammed",
    date: "09-12-2025",
    amount: "",
    action: "Review",
  },
]

export function NewApplications() {
  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold text-foreground mb-6">New Applications</h2>
      <div className="space-y-4">
        {applications.map((app) => (
          <div
            key={app.id}
            className="flex items-center justify-between p-4 bg-background rounded-lg border border-border"
          >
            <div>
              <p className="text-sm font-semibold text-foreground">{app.type}</p>
              <p className="text-xs text-muted-foreground">{app.name}</p>
              <p className="text-xs text-muted-foreground">{app.date}</p>
            </div>
            <div className="text-right">
              {app.amount && <p className="text-sm font-semibold text-foreground">{app.amount}</p>}
              <Button variant="outline" size="sm" className="mt-2 bg-transparent">
                {app.action}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
