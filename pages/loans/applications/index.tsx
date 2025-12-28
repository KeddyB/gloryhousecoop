"use client";

import { useState } from "react";
import { useRouter } from "next/router";
import { Sidebar } from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import ErrorBoundary from "@/components/ErrorBoundary";
import {
  ArrowLeft,
  User,
  Users,
  Wallet,
  FileText,
  Eye,
  CheckCircle,
  ArrowRight,
  Search,
  Upload,
  CircleCheck,
  Briefcase,
} from "lucide-react";

const steps = [
  { id: 1, name: "Applicant Information", icon: User },
  { id: 2, name: "Loan Details", icon: Wallet },
  { id: 3, name: "Third Party Details", icon: Users },
  { id: 4, name: "Document Upload", icon: FileText },
  { id: 5, name: "Review & Submit", icon: Eye },
];

const mockMembers = [
  {
    id: "MEM001",
    name: "Ahmed Rahman",
    phone: "+880 1712-345678",
    email: "ahmed@example.com",
  },
  {
    id: "MEM002",
    name: "John Doe",
    phone: "+234 801-234-5678",
    email: "john@example.com",
  },
  {
    id: "MEM003",
    name: "Jane Smith",
    phone: "+234 902-345-6789",
    email: "jane@example.com",
  },
];

export default function ApplicationsPage() {
  return (
    <ErrorBoundary>
      <LoanApplicationForm />
    </ErrorBoundary>
  );
}

function LoanApplicationForm() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMember, setSelectedMember] = useState<
    (typeof mockMembers)[0] | null
  >(null);

  const [formData, setFormData] = useState({
    loanAmount: "200000",
    interestRate: "",
    collateralType: "",
    collateralValue: "",
    tenure: "",
    purpose: "",
    thirdPartyName: "",
    thirdPartyPhone: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const filteredMembers = mockMembers.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.phone.includes(searchQuery)
  );

  const progress = (currentStep / steps.length) * 100;

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 overflow-auto bg-gray-50/50">
        <div className="p-8 max-w-5xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Submit a Loan Application
              </h1>
              <p className="text-sm text-muted-foreground">
                Submit a new loan application
              </p>
            </div>
          </div>

          {/* Progress Card */}
          <Card className="border-none shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">Registration Process</h3>
                <span className="text-xs font-medium px-2 py-1 bg-gray-100 rounded-full">
                  {currentStep} of {steps.length}
                </span>
              </div>
              <Progress value={progress} className="h-1.5 mb-8 bg-gray-100" />

              <div className="flex justify-between relative">
                {steps.map((step) => {
                  const isActive = currentStep === step.id;
                  const isCompleted = currentStep > step.id;
                  const Icon = step.icon;

                  return (
                    <div
                      key={step.id}
                      className="flex flex-col items-center gap-2 z-10"
                    >
                      <div
                        className={cn(
                          "h-10 w-10 rounded-full flex items-center justify-center transition-all duration-300 border-2",
                          isCompleted
                            ? "bg-black border-black text-white"
                            : isActive
                            ? "bg-white border-black text-black"
                            : "bg-white border-gray-200 text-gray-400"
                        )}
                      >
                        {isCompleted ? (
                          <CircleCheck className="h-6 w-6" />
                        ) : (
                          <Icon className="h-5 w-5" />
                        )}
                      </div>
                      <span
                        className={cn(
                          "text-[11px] font-medium transition-colors",
                          isActive || isCompleted
                            ? "text-black"
                            : "text-gray-400"
                        )}
                      >
                        {step.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Form Content */}
          <Card className="border-none shadow-sm min-h-[400px]">
            <CardContent className="p-8">
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-1">
                      Applicant Information
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Select a member for this loan application
                    </p>
                  </div>

                  <div className="space-y-4">
                    <label className="text-sm font-medium">Select Member</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search by name, member ID, phone or email..."
                        className="pl-10 bg-gray-50 border-none h-12"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2 mt-4">
                      {filteredMembers.map((member) => (
                        <div
                          key={member.id}
                          onClick={() => setSelectedMember(member)}
                          className={cn(
                            "flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer hover:bg-gray-50",
                            selectedMember?.id === member.id
                              ? "border-black bg-gray-50/50"
                              : "border-gray-100"
                          )}
                        >
                          <div className="h-10 w-10 rounded-full bg-gray-200" />
                          <div className="flex-1">
                            <p className="font-semibold text-sm">
                              {member.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {member.id} • {member.phone}
                            </p>
                          </div>
                          {selectedMember?.id === member.id && (
                            <CheckCircle className="h-5 w-5 text-black" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-1">Loan Details</h3>
                    <p className="text-sm text-muted-foreground">
                      Enter the details of the loan
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Loan Amount *
                      </label>
                      <Input
                        name="loanAmount"
                        value={formData.loanAmount}
                        onChange={handleChange}
                        placeholder="200000"
                        className="bg-gray-50 border-none h-12"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Interest Rate % *
                      </label>
                      <Input
                        name="interestRate"
                        value={formData.interestRate}
                        onChange={handleChange}
                        placeholder="Enter rate"
                        className="bg-gray-50 border-none h-12"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Collateral Type *
                      </label>
                      <Select
                        onValueChange={(v) =>
                          handleSelectChange("collateralType", v)
                        }
                        value={formData.collateralType}
                      >
                        <SelectTrigger className="bg-gray-50 border-none h-12">
                          <SelectValue placeholder="Select collateral type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="property">Property</SelectItem>
                          <SelectItem value="vehicle">Vehicle</SelectItem>
                          <SelectItem value="savings">Savings</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Collateral Value *
                      </label>
                      <Input
                        name="collateralValue"
                        value={formData.collateralValue}
                        onChange={handleChange}
                        placeholder="Enter estimated value"
                        className="bg-gray-50 border-none h-12"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Tenure (Months)
                      </label>
                      <Select
                        onValueChange={(v) => handleSelectChange("tenure", v)}
                        value={formData.tenure}
                      >
                        <SelectTrigger className="bg-gray-50 border-none h-12">
                          <SelectValue placeholder="Select tenure" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="6">6 Months</SelectItem>
                          <SelectItem value="12">12 Months</SelectItem>
                          <SelectItem value="24">24 Months</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Purpose *</label>
                    <Textarea
                      name="purpose"
                      value={formData.purpose}
                      onChange={handleChange}
                      placeholder="Describe the purpose of the loan"
                      className="bg-gray-50 border-none min-h-[100px] resize-none"
                    />
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-1">
                      Third Party Details
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Information about the third party borrower or guarantor
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Third Party Borrower Name *
                      </label>
                      <Input
                        name="thirdPartyName"
                        value={formData.thirdPartyName}
                        onChange={handleChange}
                        placeholder="Enter Full name"
                        className="bg-gray-50 border-none h-12"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Phone Number *
                      </label>
                      <Input
                        name="thirdPartyPhone"
                        value={formData.thirdPartyPhone}
                        onChange={handleChange}
                        placeholder="+234 1XXX-XXXXX"
                        className="bg-gray-50 border-none h-12"
                      />
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 4 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-1">
                      Documents Upload
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Upload necessary documents for verification
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="text-sm font-medium">
                        Collateral Documents
                      </label>
                      <div className="border-2 border-dashed border-gray-200 rounded-xl p-10 flex flex-col items-center justify-center gap-3 bg-gray-50/50 hover:bg-gray-50 hover:border-gray-300 transition-all cursor-pointer">
                        <div className="h-10 w-10 rounded-full bg-white shadow-sm flex items-center justify-center">
                          <Upload className="h-5 w-5 text-gray-400" />
                        </div>
                        <p className="text-sm text-gray-500 font-medium">
                          Click to upload collateral docs
                        </p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-sm font-medium">
                        Loan Agreement
                      </label>
                      <div className="border-2 border-dashed border-gray-200 rounded-xl p-10 flex flex-col items-center justify-center gap-3 bg-gray-50/50 hover:bg-gray-50 hover:border-gray-300 transition-all cursor-pointer">
                        <div className="h-10 w-10 rounded-full bg-white shadow-sm flex items-center justify-center">
                          <Upload className="h-5 w-5 text-gray-400" />
                        </div>
                        <p className="text-sm text-gray-500 font-medium">
                          Click to upload income proofs
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 5 && (
                <div className="space-y-8">
                  <div className="text-center space-y-2">
                    <h3 className="text-xl font-bold">
                      Review Your Application
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Please review all information before submitting
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="bg-gray-50/50 border-gray-100 shadow-none">
                      <CardContent className="p-6 space-y-4">
                        <h4 className="text-sm font-bold border-b pb-2">
                          Applicant Information
                        </h4>
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Type:</span>
                            <span className="font-medium text-right">
                              Member
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Name:</span>
                            <span className="font-medium text-right">
                              {selectedMember?.name || "N/A"}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Phone:</span>
                            <span className="font-medium text-right">
                              {selectedMember?.phone || "N/A"}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-gray-50/50 border-gray-100 shadow-none">
                      <CardContent className="p-6 space-y-4">
                        <h4 className="text-sm font-bold border-b pb-2">
                          Loan Details
                        </h4>
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Loan Amount:</span>
                            <span className="font-medium text-right">
                              N{Number(formData.loanAmount).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Tenure:</span>
                            <span className="font-medium text-right">
                              {formData.tenure} Months
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">
                              Interest Rate:
                            </span>
                            <span className="font-medium text-right">
                              {formData.interestRate}%
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">
                              Interest Monthly Fee:
                            </span>
                            <span className="font-medium text-right">
                              N
                              {(
                                Number(formData.loanAmount) *
                                (Number(formData.interestRate) / 100)
                              ).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Collateral:</span>
                            <span className="font-medium text-right">
                              {formData.collateralType || "None"}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Footer Navigation */}
          <div className="flex items-center justify-between pt-4">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="px-8 h-12 rounded-xl bg-white"
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Previous
            </Button>

            {currentStep < steps.length ? (
              <Button
                onClick={handleNext}
                className="px-8 h-12 rounded-xl bg-black text-white hover:bg-black/90 transition-all font-semibold"
                disabled={currentStep === 1 && !selectedMember}
              >
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={() => {
                  alert("Application Submitted Successfully!");
                  router.push("/loans/list");
                }}
                className="px-8 h-12 rounded-xl bg-black text-white hover:bg-black/90 transition-all font-semibold"
              >
                <FileText className="mr-2 h-4 w-4" /> Submit Application
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
