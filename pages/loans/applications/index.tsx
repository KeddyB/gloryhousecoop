"use client";

import { useState, useEffect, useRef } from "react";
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
  Loader2,
  File as FileIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { AmountInput } from "@/components/ui/amount-input";
import { Member } from "@/lib/types/members";

const steps = [
  { id: 1, name: "Applicant Information", icon: User },
  { id: 2, name: "Loan Details", icon: Wallet },
  { id: 3, name: "Third Party Details", icon: Users },
  { id: 4, name: "Document Upload", icon: FileText },
  { id: 5, name: "Review & Submit", icon: Eye },
];

const MEMBERS_PER_PAGE = 5;

export default function ApplicationsPage() {
  return (
    <ErrorBoundary>
      <LoanApplicationForm />
    </ErrorBoundary>
  );
}

function LoanApplicationForm() {
  const router = useRouter();
  const supabase = createClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [memberPage, setMemberPage] = useState(1);
  const [totalMemberCount, setTotalMemberCount] = useState(0);

  const collateralFileRef = useRef<HTMLInputElement>(null);
  const agreementFileRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    loanAmount: "",
    interestRate: "",
    collateralType: "",
    collateralValue: "",
    tenure: "",
    paymentInterval: "",
    purpose: "",
    thirdPartyName: "",
    thirdPartyPhone: "",
    collateralDocsUrl: "",
    loanAgreementUrl: "",
  });

  const [files, setFiles] = useState<{
    collateral: File | null;
    agreement: File | null;
  }>({
    collateral: null,
    agreement: null,
  });

  const [isUploading, setIsUploading] = useState({
    collateral: false,
    agreement: false,
  });

  // Member Search and Fetch
  useEffect(() => {
    const fetchMembers = async () => {
      setIsSearching(true);
      const from = (memberPage - 1) * MEMBERS_PER_PAGE;
      const to = from + MEMBERS_PER_PAGE - 1;

      let result;
      if (searchQuery.length >= 2) {
        result = await supabase
          .from("members")
          .select("*", { count: "exact" })
          .or(
            `full_name.ilike.%${searchQuery}%,name.ilike.%${searchQuery}%,member_id.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`
          )
          .range(from, to)
          .order("name", { ascending: true });
      } else {
        result = await supabase
          .from("members")
          .select("*", { count: "exact" })
          .range(from, to)
          .order("name", { ascending: true });
      }

      const { data, error, count } = result;

      if (!error && data) {
        setMembers(data);
        setTotalMemberCount(count || 0);
      } else if (error) {
        console.error("Error fetching members:", error);
      }
      setIsSearching(false);
    };

    const timer = setTimeout(fetchMembers, searchQuery.length >= 2 ? 500 : 0);
    return () => clearTimeout(timer);
  }, [searchQuery, memberPage, supabase]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => {
      const newData = { ...prev, [name]: value };

      // If tenure changes, check if paymentInterval is still valid
      if (name === "tenure" && prev.paymentInterval) {
        const tenure = Number(value);
        const interval = Number(prev.paymentInterval);

        if (interval > tenure || tenure % interval !== 0) {
          newData.paymentInterval = "";
        }
      }

      return newData;
    });
  };

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "collateral" | "agreement"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Limit to documents and images
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/jpeg",
      "image/png",
    ];
    if (!allowedTypes.includes(file.type)) {
      toast.error(
        "Invalid file type: Please upload only PDF, DOC, DOCX, or Image files."
      );
      return;
    }

    setFiles((prev) => ({ ...prev, [type]: file }));

    // Auto-upload
    setIsUploading((prev) => ({ ...prev, [type]: true }));
    const fileExt = file.name.split(".").pop();
    const fileName = `${type}_${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from("loan-documents")
      .upload(fileName, file);

    if (error) {
      toast.error(`Upload failed: ${error.message}`);
    } else if (data) {
      const {
        data: { publicUrl },
      } = supabase.storage.from("loan-documents").getPublicUrl(data.path);

      const stateKey =
        type === "collateral" ? "collateralDocsUrl" : "loanAgreementUrl";
      setFormData((prev) => ({ ...prev, [stateKey]: publicUrl }));
      toast.success(
        `${
          type === "collateral" ? "Collateral document" : "Loan agreement"
        } uploaded successfully`
      );
    }
    setIsUploading((prev) => ({ ...prev, [type]: false }));
  };

  const validateStep = () => {
    switch (currentStep) {
      case 1:
        if (!selectedMember) {
          toast.error("Please select a member to proceed.");
          return false;
        }
        break;
      case 2:
        if (
          !formData.loanAmount ||
          !formData.interestRate ||
          !formData.collateralType ||
          !formData.collateralValue ||
          !formData.tenure ||
          !formData.purpose ||
          !formData.paymentInterval
        ) {
          toast.error("Please fill in all required loan details.");
          return false;
        }

        const tenure = Number(formData.tenure);
        const interval = Number(formData.paymentInterval);

        if (interval > tenure) {
          toast.error("Repayment interval cannot be greater than loan tenure.");
          return false;
        }

        if (tenure % interval !== 0) {
          toast.error(
            "Loan tenure must be a multiple of the repayment interval."
          );
          return false;
        }
        break;
      case 3:
        // Third party details are optional now
        break;
      default:
        break;
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep() && currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;

    setIsSubmitting(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const operatorName =
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      user?.email ||
      "Operator";

    const { error } = await supabase.from("loans").insert([
      {
        member_id: selectedMember?.member_id,
        loan_amount: Number(formData.loanAmount),
        interest_rate: Number(formData.interestRate),
        collateral_type: formData.collateralType,
        collateral_value: Number(formData.collateralValue) || 0,
        tenure: Number(formData.tenure),
        interval: Number(formData.paymentInterval),
        purpose: formData.purpose,
        third_party_name: formData.thirdPartyName,
        third_party_number: formData.thirdPartyPhone,
        collateral_docs_url: formData.collateralDocsUrl,
        loan_agreement_url: formData.loanAgreementUrl,
        state: "pending",
        applied_by: user?.id,
        applied_by_name: operatorName,
      },
    ]);

    if (error) {
      toast.error(`Submission failed: ${error.message}`);
      setIsSubmitting(false);
    } else {
      toast.success("Loan application submitted successfully!");
      router.push("/loans/list");
    }
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return !!selectedMember;
      case 2:
        return (
          !!formData.loanAmount &&
          !!formData.interestRate &&
          !!formData.collateralType &&
          !!formData.collateralValue &&
          !!formData.tenure &&
          !!formData.purpose &&
          !!formData.paymentInterval
        );
      case 3:
        // Optional
        return true;
      case 4:
        return !!formData.collateralDocsUrl && !!formData.loanAgreementUrl;
      default:
        return true;
    }
  };

  const isValid = isStepValid();

  const progress = (currentStep / steps.length) * 100;
  const totalPages = Math.ceil(totalMemberCount / MEMBERS_PER_PAGE);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 overflow-auto bg-background">
        <div className="p-8 w-full mx-auto space-y-8">
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
          <Card className="shadow-sm">
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
          <Card className="shadow-sm min-h-100">
            <CardContent className="p-8">
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-1">
                      Applicant Information
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Search and select a member for this loan application
                    </p>
                  </div>

                  <div className="space-y-4">
                    <label className="text-sm font-medium">Search Member</label>
                    <div className="relative">
                      {isSearching ? (
                        <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
                      ) : (
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      )}
                      <Input
                        placeholder="Search by name, member ID, phone or email..."
                        className="pl-10 bg-gray-50 border-none h-12"
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setMemberPage(1);
                        }}
                      />
                    </div>

                    <div className="space-y-2 mt-4">
                      {members.map((member) => (
                        <div
                          key={member.member_id}
                          onClick={() => {
                            setSelectedMember(member);
                          }}
                          className={cn(
                            "flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer hover:bg-gray-50",
                            selectedMember?.member_id === member.member_id
                              ? "border-green-600 bg-green-50/50"
                              : "border-gray-100"
                          )}
                        >
                          <div
                            className={cn(
                              "h-10 w-10 rounded-full flex items-center justify-center",
                              selectedMember?.member_id === member.member_id
                                ? "bg-green-100"
                                : "bg-gray-200"
                            )}
                          >
                            <User
                              className={cn(
                                "h-5 w-5",
                                selectedMember?.member_id === member.member_id
                                  ? "text-green-600"
                                  : "text-gray-500"
                              )}
                            />
                          </div>
                          <div className="flex-1">
                            <p
                              className={cn(
                                "font-semibold text-sm",
                                selectedMember?.member_id === member.member_id
                                  ? "text-green-900"
                                  : "text-black"
                              )}
                            >
                              {member.full_name || member.name}
                            </p>
                            <p
                              className={cn(
                                "text-xs",
                                selectedMember?.member_id === member.member_id
                                  ? "text-green-700"
                                  : "text-muted-foreground"
                              )}
                            >
                              {member.member_id} • {member.phone}
                            </p>
                          </div>
                          {selectedMember?.member_id === member.member_id && (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          )}
                        </div>
                      ))}
                      {!isSearching && members.length === 0 && (
                        <p className="text-center py-4 text-sm text-muted-foreground">
                          {searchQuery.length >= 2
                            ? `No members found matching &quot;${searchQuery}&quot;`
                            : "No members found"}
                        </p>
                      )}
                    </div>

                    {/* Member Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-center gap-4 pt-4 border-t border-gray-100">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setMemberPage((prev) => Math.max(1, prev - 1))
                          }
                          disabled={memberPage === 1 || isSearching}
                          className="h-8 px-2"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-xs font-medium">
                          Page {memberPage} of {totalPages}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setMemberPage((prev) =>
                              Math.min(totalPages, prev + 1)
                            )
                          }
                          disabled={memberPage === totalPages || isSearching}
                          className="h-8 px-2"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
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
                      <AmountInput
                        value={formData.loanAmount}
                        onValueChange={(val) =>
                          handleSelectChange("loanAmount", val)
                        }
                        placeholder="Enter Loan Amount"
                        className="bg-gray-50 border-none h-12"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Interest Rate % *
                      </label>
                      <Input
                        name="interestRate"
                        type="number"
                        value={formData.interestRate}
                        onChange={handleChange}
                        placeholder="Enter rate (e.g. 5)"
                        className="bg-gray-50 border-none h-12"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Collateral Type *
                      </label>
                      <Input
                        name="collateralType"
                        type="text"
                        value={formData.collateralType}
                        onChange={handleChange}
                        placeholder="Enter collateral Type"
                        className="bg-gray-50 border-none h-12"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Collateral Value *
                      </label>
                      <AmountInput
                        value={formData.collateralValue}
                        onValueChange={(val) =>
                          handleSelectChange("collateralValue", val)
                        }
                        placeholder="Enter estimated value"
                        className="bg-gray-50 border-none h-12"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Tenure (Months) *
                      </label>
                      <Select
                        onValueChange={(v) => handleSelectChange("tenure", v)}
                        value={formData.tenure}
                      >
                        <SelectTrigger className="bg-gray-50 border-none h-12 w-full">
                          <SelectValue placeholder="Select tenure" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="3">3 Months</SelectItem>
                          <SelectItem value="6">6 Months</SelectItem>
                          <SelectItem value="9">9 Months</SelectItem>
                          <SelectItem value="12">12 Months</SelectItem>
                          <SelectItem value="24">24 Months</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Repayment Interval *
                      </label>
                      <Select
                        onValueChange={(v) =>
                          handleSelectChange("paymentInterval", v)
                        }
                        value={formData.paymentInterval}
                      >
                        <SelectTrigger className="bg-gray-50 border-none h-12 w-full">
                          <SelectValue placeholder="Select payment interval" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Monthly</SelectItem>
                          <SelectItem
                            value="3"
                            disabled={
                              !formData.tenure ||
                              Number(formData.tenure) < 3 ||
                              Number(formData.tenure) % 3 !== 0
                            }
                          >
                            Quarterly (3 months)
                          </SelectItem>
                          <SelectItem
                            value="6"
                            disabled={
                              !formData.tenure ||
                              Number(formData.tenure) < 6 ||
                              Number(formData.tenure) % 6 !== 0
                            }
                          >
                            Semi-Annual (6 months)
                          </SelectItem>
                          <SelectItem
                            value="12"
                            disabled={
                              !formData.tenure ||
                              Number(formData.tenure) < 12 ||
                              Number(formData.tenure) % 12 !== 0
                            }
                          >
                            Annual (12 months)
                          </SelectItem>
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
                      className="bg-gray-50 border-none min-h-25 resize-none"
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
                        Third Party Borrower Name (Optional)
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
                        Phone Number (Optional)
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
                      Upload necessary documents for verification (PDF, Image,
                      or DOC)
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label
                        className="text-sm font-medium"
                        htmlFor="agreement-file"
                      >
                        Collateral Documents
                      </label>
                      <input
                        id="agreement-file"
                        type="file"
                        ref={collateralFileRef}
                        className="hidden"
                        onChange={(e) => handleFileChange(e, "collateral")}
                        accept=".pdf,.doc,.docx,image/*"
                      />
                      <div
                        onClick={() => collateralFileRef.current?.click()}
                        className={cn(
                          "border-2 border-dashed border-gray-200 rounded-xl p-10 flex flex-col items-center justify-center gap-3 bg-gray-50/50 hover:bg-gray-50 hover:border-gray-300 transition-all cursor-pointer",
                          formData.collateralDocsUrl &&
                            "border-green-300 bg-green-50/20"
                        )}
                      >
                        {isUploading.collateral ? (
                          <Loader2 className="h-10 w-10 text-gray-400 animate-spin" />
                        ) : formData.collateralDocsUrl ? (
                          <CheckCircle className="h-10 w-10 text-green-500" />
                        ) : (
                          <Upload className="h-10 w-10 text-gray-400" />
                        )}
                        <p className="text-sm text-gray-500 font-medium">
                          {isUploading.collateral
                            ? "Uploading..."
                            : formData.collateralDocsUrl
                            ? "Uploaded Successfully"
                            : "Click to upload collateral docs"}
                        </p>
                        {files.collateral && (
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <FileIcon className="h-3 w-3" />
                            <span>{files.collateral.name}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label
                        className="text-sm font-medium"
                        htmlFor="agreement-file"
                      >
                        Loan Agreement
                      </label>
                      <input
                        id="agreement-file"
                        type="file"
                        ref={agreementFileRef}
                        className="hidden"
                        onChange={(e) => handleFileChange(e, "agreement")}
                        accept=".pdf,.doc,.docx,image/*"
                      />
                      <div
                        onClick={() => agreementFileRef.current?.click()}
                        className={cn(
                          "border-2 border-dashed border-gray-200 rounded-xl p-10 flex flex-col items-center justify-center gap-3 bg-gray-50/50 hover:bg-gray-50 hover:border-gray-300 transition-all cursor-pointer",
                          formData.loanAgreementUrl &&
                            "border-green-300 bg-green-50/20"
                        )}
                      >
                        {isUploading.agreement ? (
                          <Loader2 className="h-10 w-10 text-gray-400 animate-spin" />
                        ) : formData.loanAgreementUrl ? (
                          <CheckCircle className="h-10 w-10 text-green-500" />
                        ) : (
                          <Upload className="h-10 w-10 text-gray-400" />
                        )}
                        <p className="text-sm text-gray-500 font-medium">
                          {isUploading.agreement
                            ? "Uploading..."
                            : formData.loanAgreementUrl
                            ? "Uploaded Successfully"
                            : "Click to upload loan agreement"}
                        </p>
                        {files.agreement && (
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <FileIcon className="h-3 w-3" />
                            <span>{files.agreement.name}</span>
                          </div>
                        )}
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
                              {selectedMember?.full_name ||
                                selectedMember?.name ||
                                "N/A"}
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
                              ₦{Number(formData.loanAmount).toLocaleString()}
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
                              ₦
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
              disabled={currentStep === 1 || isSubmitting}
              className="px-8 h-12 rounded-xl bg-white"
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Previous
            </Button>

            {currentStep < steps.length ? (
              <Button
                onClick={handleNext}
                className={cn(
                  "px-8 h-12 rounded-xl transition-all font-semibold cursor-pointer",
                  isValid
                    ? "bg-black text-white hover:bg-black/90"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                )}
                disabled={!isValid}
              >
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!isValid || isSubmitting}
                className={cn(
                  "px-8 h-12 rounded-xl transition-all font-semibold",
                  isValid && !isSubmitting
                    ? "bg-black text-white hover:bg-black/90"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                )}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                    Submitting...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" /> Submit Application
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
