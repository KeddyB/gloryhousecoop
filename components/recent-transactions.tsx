import { Card } from "@/components/ui/card"

const transactions = [
  {
    id: 1,
    title: "Interest Fee Collection",
    name: "Ahmed rahman",
    amount: "N20000",
    status: "Completed",
  },
  {
    id: 2,
    title: "Loan Disbursement",
    name: "Fatima Khatun",
    amount: "N100,000",
    status: "Completed",
  },
  {
    id: 3,
    title: "Loan Repayment",
    name: "Karim Uddin",
    amount: "N231,900",
    status: "Completed",
  },
]

export function RecentTransactions() {
  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold text-foreground mb-6">Recent Transactions</h2>
      <div className="space-y-4">
        {transactions.map((transaction) => (
          <div
            key={transaction.id}
            className="flex items-center justify-between p-4 bg-background rounded-lg border border-border"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-gray-300" />
              <div>
                <p className="text-sm font-semibold text-foreground">{transaction.title}</p>
                <p className="text-xs text-muted-foreground">{transaction.name}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-foreground">{transaction.amount}</p>
              <span className="inline-block px-2 py-1 bg-foreground text-background text-xs rounded font-medium">
                {transaction.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
