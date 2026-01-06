import { Sidebar } from "@/components/sidebar"
import { MobileHeader } from "@/components/mobile-header"
import { useRouter } from "next/router"

export default function CalculatorPage() {
  const router = useRouter();
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <MobileHeader title="Loan Calculator" onBack={() => router.back()} />
      <div className="flex-1 p-8 pt-[4.5rem] md:pt-8">
        <div className="hidden md:block">
            <h1 className="text-3xl font-bold mb-4">Calculator</h1>
            <p className="text-muted-foreground">Calculator page placeholder content</p>
        </div>
      </div>
    </div>
  )
}
