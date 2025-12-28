"use client";

import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Search,
  Banknote,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";

const MOCK_REPAYMENTS = [
  {
    id: "1",
    member: {
      name: "Ahmed Rahman",
      member_id: "MEM001",
    },
    installments_paid: 1,
    total_installments: 4,
    paid_amount: 125000,
    remaining_amount: 375000,
    quarterly_amount: 125000,
    next_due_date: "05-06-2024",
    last_payment_date: "05-03-2024",
    status: "active",
    overdue_days: 0,
  },
  {
    id: "2",
    member: {
      name: "Rashida Begum",
      member_id: "MEM002",
    },
    installments_paid: 1,
    total_installments: 4,
    paid_amount: 125000,
    remaining_amount: 375000,
    quarterly_amount: 125000,
    next_due_date: "05-06-2024",
    last_payment_date: "05-03-2024",
    status: "overdue",
    overdue_days: 15,
  },
  {
    id: "3",
    member: {
      name: "Kahrima Elebur",
      member_id: "MEM002", // Typo in design image but kept for consistency
    },
    installments_paid: 1,
    total_installments: 4,
    paid_amount: 125000,
    remaining_amount: 375000,
    quarterly_amount: 125000,
    next_due_date: "05-06-2024",
    last_payment_date: "05-03-2024",
    status: "active",
    overdue_days: 0,
  },
];

export default function RepaymentPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRepayment, setSelectedRepayment] = useState<
    (typeof MOCK_REPAYMENTS)[0] | null
  >(null);
  const [searchQuery, setSearchQuery] = useState("");

  const handlePaymentClick = (repayment: (typeof MOCK_REPAYMENTS)[0]) => {
    setSelectedRepayment(repayment);
    setIsModalOpen(true);
  };

  return (
    <div className="flex h-screen bg-gray-50/50">
      <Sidebar />
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Repayment Management
              </h1>
              <p className="text-sm text-gray-500">
                Track loan repayments and manage collections
              </p>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
              <CardContent className="p-6 flex justify-between items-center">
                <div>
                  <p className="text-[10px] uppercase font-bold text-gray-400 mb-1 tracking-wider">
                    Total Outstanding
                  </p>
                  <h3 className="text-2xl font-bold text-gray-900">₦750,000</h3>
                </div>
                <div className="h-10 w-10 bg-blue-50 rounded-xl flex items-center justify-center border border-blue-100">
                  <span className="text-blue-600 font-bold text-lg">₦</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
              <CardContent className="p-6 flex justify-between items-center">
                <div>
                  <p className="text-[10px] uppercase font-bold text-gray-400 mb-1 tracking-wider">
                    Overdue Loans
                  </p>
                  <h3 className="text-2xl font-bold text-gray-900">3</h3>
                </div>
                <div className="h-10 w-10 bg-red-50 rounded-xl flex items-center justify-center border border-red-100">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
              <CardContent className="p-6 flex justify-between items-center">
                <div>
                  <p className="text-[10px] uppercase font-bold text-gray-400 mb-1 tracking-wider">
                    Today&apos;s Collection
                  </p>
                  <h3 className="text-2xl font-bold text-gray-900">0</h3>
                </div>
                <div className="h-10 w-10 bg-green-50 rounded-xl flex items-center justify-center border border-green-100">
                  <Banknote className="h-5 w-5 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
              <CardContent className="p-6 flex justify-between items-center">
                <div>
                  <p className="text-[10px] uppercase font-bold text-gray-400 mb-1 tracking-wider">
                    Collection Rate
                  </p>
                  <h3 className="text-2xl font-bold text-gray-900">45%</h3>
                </div>
                <div className="h-10 w-10 bg-purple-50 rounded-xl flex items-center justify-center border border-purple-100">
                  <CheckCircle2 className="h-5 w-5 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Active Loans - Repayment Status */}
          <Card className="border-none shadow-sm rounded-2xl overflow-hidden border border-gray-100">
            <CardHeader className="flex flex-row items-center justify-between pb-6 space-y-0">
              <CardTitle className="text-sm font-bold uppercase tracking-tight text-gray-800">
                Active Loans - Repayment Status
              </CardTitle>
              <div className="flex items-center gap-4">
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
                  <Input
                    placeholder="Search by applicant..."
                    className="pl-8 h-9 text-xs border-gray-100 bg-gray-50/50 rounded-lg focus:ring-0 focus:border-gray-200 transition-all"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Select defaultValue="all">
                  <SelectTrigger className="w-[120px] h-9 text-xs border-gray-100 bg-gray-50/50 rounded-lg">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
                <Select defaultValue="all">
                  <SelectTrigger className="w-[120px] h-9 text-xs border-gray-100 bg-gray-50/50 rounded-lg">
                    <SelectValue placeholder="All Month" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Month</SelectItem>
                    <SelectItem value="current">Current Month</SelectItem>
                    <SelectItem value="next">Next Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50 hover:bg-gray-50/50 border-gray-100">
                    <TableHead className="text-[10px] font-bold uppercase text-gray-500 py-4 px-6">
                      Applicant
                    </TableHead>
                    <TableHead className="text-[10px] font-bold uppercase text-gray-500 text-center">
                      Progress
                    </TableHead>
                    <TableHead className="text-[10px] font-bold uppercase text-gray-500 text-center">
                      Amount Details
                    </TableHead>
                    <TableHead className="text-[10px] font-bold uppercase text-gray-500 text-center">
                      Next Due
                    </TableHead>
                    <TableHead className="text-[10px] font-bold uppercase text-gray-500 text-center">
                      Status
                    </TableHead>
                    <TableHead className="text-[10px] font-bold uppercase text-gray-500 text-right px-6">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_REPAYMENTS.map((repayment) => (
                    <TableRow
                      key={repayment.id}
                      className="border-gray-50 hover:bg-gray-50/30 transition-colors"
                    >
                      <TableCell className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 bg-gray-100 border border-gray-200">
                            <AvatarFallback className="text-[10px] font-bold">
                              {repayment.member.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-bold text-[11px] text-gray-900 leading-tight">
                              {repayment.member.name}
                            </p>
                            <p className="text-[10px] text-gray-400 font-mono mt-0.5 tracking-tighter">
                              {repayment.member.member_id}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col items-center gap-1.5 min-w-[120px]">
                          <div className="flex justify-between w-full text-[10px] font-medium text-gray-500 px-1">
                            <span>
                              {repayment.installments_paid}/
                              {repayment.total_installments} installments
                            </span>
                          </div>
                          <Progress
                            value={
                              (repayment.installments_paid /
                                repayment.total_installments) *
                              100
                            }
                            className="h-1.5 bg-gray-100"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="inline-grid grid-cols-[auto,1fr] gap-x-3 text-[10px] leading-relaxed">
                          <span className="text-gray-400 text-left">Paid:</span>
                          <span className="font-bold text-gray-700 text-right">
                            ₦{repayment.paid_amount.toLocaleString()}
                          </span>
                          <span className="text-gray-400 text-left">
                            Remaining:
                          </span>
                          <span className="font-bold text-gray-700 text-right">
                            ₦{repayment.remaining_amount.toLocaleString()}
                          </span>
                          <span className="text-gray-400 text-left">
                            Quarterly:
                          </span>
                          <span className="font-bold text-gray-700 text-right">
                            ₦{repayment.quarterly_amount.toLocaleString()}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <p className="text-[11px] font-bold text-gray-700">
                            {repayment.next_due_date}
                          </p>
                          {repayment.overdue_days > 0 ? (
                            <p className="text-[9px] font-bold text-red-500 uppercase tracking-tighter">
                              {repayment.overdue_days} days overdue
                            </p>
                          ) : (
                            <p className="text-[9px] font-medium text-gray-400">
                              Last: {repayment.last_payment_date}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-tighter border",
                            repayment.status === "active"
                              ? "border-black bg-black text-white"
                              : "border-red-500 bg-red-500 text-white"
                          )}
                        >
                          {repayment.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right px-6">
                        <Button
                          size="sm"
                          className="bg-black hover:bg-gray-800 text-[10px] h-8 px-4 font-bold rounded-lg gap-1.5 transition-all active:scale-95"
                          onClick={() => handlePaymentClick(repayment)}
                        >
                          <ArrowRight className="h-3 w-3" />
                          Payment
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent
          className={cn(
            "sm:max-w-xl p-0 overflow-hidden border-none shadow-2xl rounded-4xl bg-white font-sans",
            "animate-in fade-in zoom-in-95 duration-300",
            "max-h-[90vh]"
          )}
        >
          <ScrollArea className="max-h-[90vh]">
            <div className="p-10 space-y-8">
              <DialogHeader>
                <DialogTitle className="text-xl font-medium tracking-tight text-gray-900 border-none">
                  Record Payment
                </DialogTitle>
              </DialogHeader>

              {selectedRepayment && (
                <div className="space-y-8">
                  {/* Summary Card */}
                  <Card className="bg-gray-50/30 border border-gray-100/50 rounded-2xl shadow-none">
                    <CardContent className="p-8 grid grid-cols-2 gap-x-12 gap-y-8">
                      <div className="space-y-1.5">
                        <p className="text-[13px] font-medium text-gray-400">
                          Member
                        </p>
                        <p className="text-lg font-semibold text-gray-900 leading-none">
                          {selectedRepayment.member.name}
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <p className="text-[13px] font-medium text-gray-400">
                          Outstanding Amount
                        </p>
                        <p className="text-lg font-semibold text-gray-900 leading-none">
                          ₦{selectedRepayment.remaining_amount.toLocaleString()}
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <p className="text-[13px] font-medium text-gray-400">
                          Quarterly Installment
                        </p>
                        <p className="text-lg font-semibold text-gray-900 leading-none">
                          ₦{selectedRepayment.quarterly_amount.toLocaleString()}
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <p className="text-[13px] font-medium text-gray-400">
                          Next Due Date
                        </p>
                        <p className="text-lg font-semibold text-gray-900 leading-none">
                          {selectedRepayment.next_due_date}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Form fields */}
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2.5">
                        <label className="text-[15px] font-semibold text-gray-900 ml-0.5">
                          Payment Amount
                        </label>
                        <Input
                          defaultValue={selectedRepayment.quarterly_amount.toLocaleString()}
                          className="bg-[#F4F4F4] border-none h-14 text-[15px] font-medium rounded-xl focus:ring-1 ring-gray-200"
                        />
                      </div>
                      <div className="space-y-2.5">
                        <label className="text-[15px] font-semibold text-gray-900 ml-0.5">
                          Payment Method
                        </label>
                        <Select>
                          <SelectTrigger className="bg-[#F4F4F4] border-none h-14 text-[15px] font-medium rounded-xl focus:ring-1 ring-gray-200">
                            <SelectValue placeholder="Select method" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border-gray-100 shadow-xl">
                            <SelectItem value="bank">Bank Transfer</SelectItem>
                            <SelectItem value="cash">Cash</SelectItem>
                            <SelectItem value="mobile">
                              Mobile Transfer
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      <label className="text-[15px] font-semibold text-gray-900 ml-0.5">
                        Payment Date
                      </label>
                      <div className="relative">
                        <Input
                          type="text"
                          defaultValue="01-06-2024"
                          className="bg-[#F4F4F4] border-none h-14 text-[15px] font-medium rounded-xl focus:ring-1 ring-gray-200 pl-4"
                        />
                        <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      <label className="text-[15px] font-semibold text-gray-900 ml-0.5">
                        Notes* (Optional)
                      </label>
                      <Textarea
                        placeholder="Add any notes about the disbursement..."
                        className="bg-[#F4F4F4] border-none min-h-[120px] text-[15px] font-medium rounded-2xl resize-none py-4 px-5 focus-visible:ring-1 ring-gray-200 placeholder:text-gray-400"
                      />
                    </div>
                  </div>

                  {/* Footer Buttons */}
                  <div className="flex justify-end gap-4 pt-4">
                    <Button
                      variant="outline"
                      className="h-12 px-8 border-gray-200 text-[15px] font-semibold rounded-xl hover:bg-gray-50 active:scale-95 transition-all w-32"
                      onClick={() => setIsModalOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="h-12 px-8 bg-black hover:bg-black/90 text-white text-[15px] font-semibold rounded-xl active:scale-95 transition-all min-w-[200px]"
                      onClick={() => setIsModalOpen(false)}
                    >
                      Confirm Payment
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
