"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Sidebar } from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, Search, Plus, Filter, TrendingUp, Clock } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { Loan } from "../types";

export default function LoanListPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchLoans = async () => {
    try {
      const { data, error } = await supabase
        .from("loans")
        .select(
          `
          *,
          member:members (
            full_name,
            name,
            member_id,
            phone
          )
        `
        )
        .order("created_at", { ascending: false });

      if (error) {
        toast({
          title: "Error fetching loans",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setLoans(data || []);
      }
    } catch (error) {
      console.error("Unexpected error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, toast]);

  const filteredLoans = loans.filter((loan) => {
    // 1. Filter by status
    if (statusFilter !== "all" && loan.state !== statusFilter) {
      return false;
    }

    // 2. Filter by search term (member name or ID)
    const searchLower = searchTerm.toLowerCase();
    const memberName = (
      loan.member?.full_name ||
      loan.member?.name ||
      ""
    ).toLowerCase();
    const memberId = (loan.member_id || "").toLowerCase();

    return memberName.includes(searchLower) || memberId.includes(searchLower);
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "disbursed":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 overflow-auto bg-gray-50/50">
        <div className="p-8 space-y-8 max-w-7xl mx-auto">
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Loan Applications
              </h1>
              <p className="text-muted-foreground">
                View and manage all loan applications in the system
              </p>
            </div>
            <Button
              className="bg-black text-white hover:bg-black/90 shadow-sm"
              onClick={() => router.push("/loans/applications")}
            >
              <Plus className="mr-2 h-4 w-4" /> New Application
            </Button>
          </div>

          {/* Stats Summary */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-none shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground tracking-wide uppercase">
                  Total Applications
                </CardTitle>
                <Wallet className="h-4 w-4 text-sky-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? <Skeleton className="h-8 w-12" /> : loans.length}
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground tracking-wide uppercase">
                  Pending Disbursement
                </CardTitle>
                <Clock className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? (
                    <Skeleton className="h-8 w-12" />
                  ) : (
                    loans.filter((l) => l.state === "pending").length
                  )}
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground tracking-wide uppercase">
                  Total Amount
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? (
                    <Skeleton className="h-8 w-24" />
                  ) : (
                    `₦${loans
                      .reduce((acc, curr) => acc + (curr.loan_amount || 0), 0)
                      .toLocaleString()}`
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Card */}
          <Card className="border-none shadow-sm bg-white">
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold">
                  Loan Applications
                </CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-black transition-colors" />
                    <Input
                      placeholder="Search by name or ID..."
                      className="pl-9 bg-gray-50 border-none h-10 w-[250px] focus-visible:ring-1 focus-visible:ring-black rounded-lg"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[160px] bg-gray-50 border-none h-10 focus:ring-1 focus:ring-black rounded-lg">
                      <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-gray-400" />
                        <SelectValue placeholder="Status" />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-none shadow-lg">
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="disbursed">Disbursed</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                      <TableHead className="py-4 pl-6 font-semibold">
                        Applicant
                      </TableHead>
                      <TableHead className="py-4 font-semibold">
                        Amount
                      </TableHead>
                      <TableHead className="py-4 font-semibold">
                        Purpose
                      </TableHead>
                      <TableHead className="py-4 font-semibold text-center">
                        Status
                      </TableHead>
                      <TableHead className="py-4 font-semibold text-center pr-6">
                        Date Submitted
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array(5)
                        .fill(0)
                        .map((_, index) => (
                          <TableRow key={index} className="animate-pulse">
                            <TableCell className="pl-6 py-4">
                              <div className="space-y-2">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-3 w-20" />
                              </div>
                            </TableCell>
                            <TableCell className="py-4">
                              <Skeleton className="h-4 w-24" />
                            </TableCell>
                            <TableCell className="py-4">
                              <Skeleton className="h-4 w-40" />
                            </TableCell>
                            <TableCell className="py-4">
                              <div className="flex justify-center">
                                <Skeleton className="h-6 w-20 rounded-full" />
                              </div>
                            </TableCell>
                            <TableCell className="py-4 pr-6">
                              <div className="flex justify-center">
                                <Skeleton className="h-4 w-24" />
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                    ) : filteredLoans.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12">
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <Wallet className="h-12 w-12 opacity-10" />
                            <p>No loan applications found</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredLoans.map((loan) => (
                        <TableRow
                          key={loan.id}
                          className="group hover:bg-gray-50/50 cursor-pointer transition-colors border-b"
                          onClick={() => router.push(`/loans/list/${loan.id}`)}
                        >
                          <TableCell className="pl-6 py-4">
                            <div className="font-semibold text-sm">
                              {loan.member?.full_name ||
                                loan.member?.name ||
                                "Unknown Member"}
                            </div>
                            <div className="text-xs text-muted-foreground font-medium">
                              #{loan.member_id}
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="font-bold text-sm">
                              ₦{Number(loan.loan_amount).toLocaleString()}
                            </div>
                            <div className="text-[10px] text-muted-foreground uppercase tracking-tight">
                              {loan.interest_rate}% Interest
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <p className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]">
                              {loan.purpose}
                            </p>
                          </TableCell>
                          <TableCell className="py-4 text-center">
                            <Badge
                              className={`rounded-full px-4 py-1 font-semibold text-[10px] uppercase tracking-wider border-none shadow-none ${getStatusColor(
                                loan.state
                              )}`}
                            >
                              {loan.state}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-4 text-center pr-6">
                            <div className="flex flex-col items-center">
                              <span className="text-sm font-medium">
                                {loan.created_at
                                  ? new Date(
                                      loan.created_at
                                    ).toLocaleDateString()
                                  : "N/A"}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {loan.created_at
                                  ? new Date(
                                      loan.created_at
                                    ).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })
                                  : "--:--"}
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
