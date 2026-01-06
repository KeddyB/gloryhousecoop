"use client"

import { useState, useEffect, useMemo, useLayoutEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/utils/supabase/client"
import {
  ChevronDown,
  LayoutGrid,
  Users,
  DollarSign,
  Banknote,
  Settings,
  LogOut,
  Menu,
  UserPlus,
  Plus,
  List,
  RotateCcw,
  Calculator,
  WalletCards,
  X,
} from "lucide-react"
import { User } from "@supabase/supabase-js"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function Sidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = useMemo(() => createClient(), [])
  const [expandedItems, setExpandedItems] = useState<string[]>(["Dashboard"])
  const [isOpen, setIsOpen] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [isMobile, setIsMobile] = useState(false)

  const menuItems = useMemo(
    () => [
      {
        id: "Dashboard",
        label: "Dashboard",
        icon: LayoutGrid,
        href: "/dashboard",
        // No submenu
      },
      {
        id: "Members",
        label: "Members",
        icon: Users,
        submenu: [
          { label: "Members List", icon: List, href: "/members/list" },
          { label: "Add Members", icon: UserPlus, href: "/members/add" },
        ],
      },
      {
        id: "Interest Fees",
        label: "Interest Fees",
        icon: DollarSign,
        submenu: [
          { label: "Fee Entry", icon: Plus, href: "/fees/entry" },
          { label: "Fee List", icon: List, href: "/fees/list" },
        ],
      },
      {
        id: "Loan Management",
        label: "Loan Management",
        icon: WalletCards,
        submenu: [
          { label: "Applications", icon: Plus, href: "/loans/applications" },
          {
            label: "Disbursement",
            icon: Banknote,
            href: "/loans/disbursement",
          },
          { label: "Loan list", icon: List, href: "/loans/list" },
          { label: "Repayment", icon: RotateCcw, href: "/loans/repayment" },
          { label: "Calculator", icon: Calculator, href: "/loans/calculator" },
        ],
      },
      // Reports removed
      {
        id: "Settings",
        label: "Settings",
        icon: Settings,
        href: "/settings",
        // No submenu
      },
    ],
    [],
  )

  // Handle Mobile Check and Initial State
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (mobile) {
        setIsOpen(false)
      } else {
        setIsOpen(true)
      }
    }
    
    // Check on mount
    checkMobile()
    
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Automatically expand the section if a submenu item is active
 useLayoutEffect(() => {
  const activeItem = menuItems.find((item) =>
    item.submenu?.some((sub) => sub.href === pathname)
  )

  if (activeItem) {
    const id = setTimeout(() => {
      setExpandedItems((prev) => {
        if (prev.includes(activeItem.id)) return prev
        return [...prev, activeItem.id]
      })
    }, 0)

    return () => clearTimeout(id)
  }
}, [pathname, menuItems])


  // Close sidebar on route change on mobile
  useLayoutEffect(() => {
    if (isMobile) {
      const id = setTimeout(() => setIsOpen(false), 0)
      return () => clearTimeout(id)
    }
  }, [pathname, isMobile])

  // Fetch current user
  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
  }, [supabase.auth])

  const toggleExpand = (item: string) => {
    setExpandedItems((prev) => (prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]))
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile Toggle Button - Visible when sidebar is closed on mobile */}
      {isMobile && !isOpen && (
         <Button
            variant="outline"
            size="icon"
            className="fixed top-4 right-4 z-30 bg-white shadow-sm h-10 w-10 md:hidden"
            onClick={() => setIsOpen(true)}
         >
            <Menu className="h-5 w-5" />
         </Button>
      )}

      <aside
        className={cn(
          "bg-white border-r border-border transition-all duration-300 flex flex-col h-screen",
          // Mobile Styles
          "fixed inset-y-0 left-0 z-50 w-[85%] max-w-[300px]",
          isOpen ? "translate-x-0 shadow-xl" : "-translate-x-full",
          // Desktop Styles
          "md:relative md:translate-x-0 md:shadow-none md:z-auto",
          isOpen ? "md:w-200" : "md:w-20"
        )}
      >
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className={`flex items-center ${isOpen ? "justify-between" : "justify-center"}`}>
            {isOpen && (
              <div className="flex items-center gap-3">
                <img src="/favicon.ico" alt="Glory House Logo" className="w-13 h-13 rounded-full" />
                <div className="flex-1">
                  <h1 className="text-xl font-semibold text-foreground">Glory House</h1>
                  <p className="text-xs text-muted-foreground">Multipurpose cooperative society limited</p>
                </div>
              </div>
            )}
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(!isOpen)}>
              {isMobile && isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <nav className={`flex-1 overflow-y-auto ${isOpen ? "p-5 space-y-2" : "p-4 space-y-2"}`}>
          {menuItems.map((item) => {
            const Icon = item.icon
            
            // Handle direct links (no submenu)
            if (!item.submenu) {
               const isActive = pathname === item.href
               return (
                <Link
                  key={item.id}
                  href={item.href || "#"}
                  className={cn(
                    `w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium hover:bg-accent transition-colors`,
                    !isOpen && "justify-center",
                    isActive ? "text-primary bg-accent" : "text-foreground"
                  )}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {isOpen && <span className="flex-1 text-left">{item.label}</span>}
                </Link>
               )
            }

            // Handle submenus
            const isExpanded = expandedItems.includes(item.id)
            const isActiveGroup = item.submenu?.some((sub) => sub.href === pathname)

            return (
              <div key={item.id}>
                <button
                  onClick={() => toggleExpand(item.id)}
                  className={cn(
                    `w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium hover:bg-accent transition-colors`,
                    !isOpen && "justify-center",
                    isActiveGroup ? "text-primary bg-accent" : "text-foreground"
                  )}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {isOpen && (
                    <>
                      <span className="flex-1 text-left">{item.label}</span>
                      <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-0" : "-rotate-90"}`} />
                    </>
                  )}
                </button>

                {isOpen && isExpanded && item.submenu && (
                  <div className="mt-2 space-y-1 ml-8">
                    {item.submenu.map((subitem, idx) => {
                      const SubIcon = subitem.icon
                      const isActive = subitem.href === pathname

                      return (
                        <Link
                          key={idx}
                          href={subitem.href}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors rounded-md",
                            isActive 
                              ? "text-primary bg-primary/10 font-medium" 
                              : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                          )}
                        >
                          <SubIcon className="h-4 w-4 flex-shrink-0" />
                          <span>{subitem.label}</span>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-border p-4 space-y-3">
          <div className={`flex items-center ${isOpen ? "gap-3" : "justify-center"}`}>
            <div className="w-8 h-8 rounded-full bg-gray-300 flex-shrink-0 flex items-center justify-center text-xs">
              {user ? (user.user_metadata?.full_name?.[0] || user.email?.[0] || 'U').toUpperCase() : ''}
            </div>
            {isOpen && (
              <div>
                <p className="text-sm font-medium text-foreground">
                  {user?.user_metadata?.full_name || user?.user_metadata?.name || 'User'}
                </p>
                <p className="text-xs text-muted-foreground truncate w-40">
                  {user?.email}
                </p>
              </div>
            )}
          </div>
          <Button variant="outline" className={`${isOpen ? "w-full" : "w-full"} justify-center gap-2 bg-transparent`} onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            {isOpen && "Logout"}
          </Button>
        </div>
      </aside>
    </>
  )
}
