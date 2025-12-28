"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import {
  ChevronDown,
  LayoutGrid,
  Users,
  DollarSign,
  Banknote,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  Eye,
  UserPlus,
  Plus,
  List,
  CheckCircle,
  RotateCcw,
  Building2,
  Calculator,
  FileText,
  Sliders,
  WalletCards,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const menuItems = [
  {
    id: "Dashboard",
    label: "Dashboard",
    icon: LayoutGrid,
    submenu: [{ label: "Overview", icon: Eye, href: "/dashboard/overview" }],
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
    id: "Monthly Fee",
    label: "Monthly Fee",
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
      { label: "Disbursement", icon: Banknote, href: "/loans/disbursement" },
      { label: "Loan list", icon: List, href: "/loans/list" },
      { label: "Repayment", icon: RotateCcw, href: "/loans/repayment" },
      // { label: "Calculator", icon: Calculator, href: "/loans/calculator" },
    ],
  },
  {
    id: "Reports",
    label: "Reports",
    icon: BarChart3,
    submenu: [{ label: "All Reports", icon: FileText, href: "/reports/all" }],
  },
  {
    id: "Settings",
    label: "Settings",
    icon: Settings,
    submenu: [
      {
        label: "App Settings",
        icon: Sliders,
        href: "/settings/app-settings",
      },
    ],
  },
];

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [expandedItems, setExpandedItems] = useState<string[]>(["Dashboard"]);
  const [isOpen, setIsOpen] = useState(true);

  // Automatically expand the section if a submenu item is active
  useEffect(() => {
    menuItems.forEach((item) => {
      if (item.submenu?.some((sub) => sub.href === pathname)) {
        if (!expandedItems.includes(item.id)) {
          setExpandedItems((prev) => [...prev, item.id]);
        }
      }
    });
  }, [pathname]);

  // Fetch current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
  }, [])

  const toggleExpand = (item: string) => {
    setExpandedItems((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  return (
    <aside
      className={`${
        isOpen ? "w-80" : "w-20"
      } bg-white border-r border-border transition-all duration-300 flex flex-col h-screen`}
    >
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div
          className={`flex items-center ${
            isOpen ? "justify-between" : "justify-center"
          }`}
        >
          {isOpen && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-sm font-semibold text-gray-700">
                GH
              </div>
              <div className="flex-1">
                <h1 className="text-xs font-semibold text-foreground">
                  Glory House
                </h1>
                <p className="text-xs text-muted-foreground">
                  Multipurpose cooperative society limited
                </p>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(!isOpen)}
          >
            <Menu className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <nav
        className={`flex-1 overflow-y-auto ${
          isOpen ? "p-4 space-y-2" : "p-2 space-y-2"
        }`}
      >
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isExpanded = expandedItems.includes(item.id);
          const isActiveGroup = item.submenu?.some(
            (sub) => sub.href === pathname
          );

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
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${
                        isExpanded ? "rotate-0" : "-rotate-90"
                      }`}
                    />
                  </>
                )}
              </button>

              {isOpen && isExpanded && item.submenu && (
                <div className="mt-2 space-y-1 ml-8">
                  {item.submenu.map((subitem, idx) => {
                    const SubIcon = subitem.icon;
                    const isActive = subitem.href === pathname;

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
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-4 space-y-3">
        <div
          className={`flex items-center ${isOpen ? "gap-3" : "justify-center"}`}
        >
          <div className="w-8 h-8 rounded-full bg-gray-300 flex-shrink-0" />
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
        <Button
          variant="outline"
          className={`${
            isOpen ? "w-full" : "w-full"
          } justify-center gap-2 bg-transparent`}
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          {isOpen && "Logout"}
        </Button>
      </div>
    </aside>
  );
}
