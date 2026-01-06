import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { Sidebar } from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
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
import {
  ArrowLeft,
  Edit,
  User,
  Phone,
  Mail,
  Calendar,
  MapPin,
  FileText,
  AlertCircle,
  Banknote,
  Wallet,
  Activity,
  DollarSign,
  Briefcase,
  Plus,
  Search,
  Download,
  Eye,
  Trash2,
  Loader2,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { EditProfileDialog } from "@/components/edit-profile-dialog";
import { ExtendLoanModal } from "@/components/extend-loan-modal";
import { Member } from "@/lib/types/members";
import {
  Loan,
  Repayment,
  Disbursement,
  InterestPayment,
} from "@/lib/types/loans";
import {
  format,
  startOfMonth,
  addMonths,
  isBefore,
  isSameMonth,
} from "date-fns";

// Define specific types to replace 'any'
interface Note {
  id: string;
  note: string;
  date: string;
  created_by_name: string;
  source: string;
}

// Local activity and display types

interface ActivityItem {
  id: string;
  title: string;
  date: string;
  created_at: string;
  amount: number;
  type: "success" | "danger";
}

interface InterestHistoryItem {
  month: string;
  amount: string;
  date: string;
  method: string;
  status: string;
  rawDate: Date;
}

interface LoanDocument {
  name: string;
  url: string;
  loanId: string;
  createdAt: string;
}

interface LoanForDocs {
  id: string;
  created_at: string;
  collateral_docs_url?: string | null;
  loan_agreement_url?: string | null;
}

export default function MemberProfile() {
  const router = useRouter();
  const { id } = router.query;
  const memberId = Array.isArray(id) ? id[0] : id;

  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const supabase = createClient();

  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState("");
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);
  const [isDeletingNote, setIsDeletingNote] = useState(false);
  const [isAddingNote, setIsAddingNote] = useState(false);

  const [editLoanDialogOpen, setEditLoanDialogOpen] = useState(false);
  const [loanToEdit, setLoanToEdit] = useState<Loan | null>(null);

  async function handleNoteSubmit() {
    if (!newNote.trim() || !memberId) return;
    setIsAddingNote(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        alert("You must be logged in to add a note.");
        return;
      }

      const { error } = await supabase.from("member_notes").insert([
        {
          member_id: memberId,
          note: newNote,
          created_by_name: user.user_metadata.name,
        },
      ]);

      if (error) {
        throw error;
      }

      // Success path
      setNewNote("");
      setNoteDialogOpen(false); // Close dialog immediately
      await fetchNotes(); // Then refresh notes in background
    } catch (error) {
      console.error("Error adding note:", error);
      alert("Could not add note.");
    } finally {
      setIsAddingNote(false);
    }
  }

  async function handleDeleteNote(noteId: string) {
    setIsDeletingNote(true);
    try {
      const response = await fetch("/api/delete-note", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ note_id: noteId }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete note");
      }

      await fetchNotes(); // Refresh notes
    } catch (error) {
      console.error("Error deleting note:", error);
      alert("Could not delete note.");
    } finally {
      setNoteToDelete(null);
      setDeleteDialogOpen(false);
      setIsDeletingNote(false);
    }
  }

  async function fetchMember() {
    if (!memberId) return;

    try {
      const { data, error } = await supabase
        .from("members")
        .select("*")
        .eq("member_id", memberId)
        .single();

      if (error) {
        console.error("Error fetching member:", error);
      } else {
        setMember(data);
      }
    } catch (error) {
      console.error("Unexpected error:", error);
    } finally {
      setLoading(false);
    }
  }

  const [totalInterestPaid, setTotalInterestPaid] = useState<number | null>(
    null
  );
  const [pendingInterest, setPendingInterest] = useState<number | null>(null);
  const [missedRepayment, setMissedRepayment] = useState<number>(0);
  const [activeLoan, setActiveLoan] = useState<number | null>(null);
  const [activeLoans, setActiveLoans] = useState<Loan[]>([]);
  const [currentBalance, setCurrentBalance] = useState<number | null>(null);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[] | null>(
    null
  );
  const [allTransactions, setAllTransactions] = useState<ActivityItem[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true); // New state
  const [interestHistory, setInterestHistory] = useState<InterestHistoryItem[]>(
    []
  );
  const [loanHistory, setLoanHistory] = useState<Loan[]>([]);
  const [loanDocuments, setLoanDocuments] = useState<LoanDocument[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(true); // New state

  async function fetchMemberData() {
    if (!memberId) return;

    try {
      // Fetch Total Interest Paid directly from interest_payments
      const { data: interestPayments, error: interestError } = await supabase
        .from("interest_payments")
        .select("amount_paid, loans!inner(member_id)")
        .eq("loans.member_id", memberId);

      if (interestError) {
        console.error("Error fetching interest payments:", interestError);
      } else {
        const totalPaid = interestPayments.reduce(
          (sum, payment) => sum + (payment.amount_paid || 0),
          0
        );
        setTotalInterestPaid(totalPaid);
      }

      // Fetch Active Loans (plural) for KPI cards
      const { data: loansData, error: loansError } = await supabase
        .from("loans")
        .select(
          "*, disbursements(created_at), interest_payments(payment_for_month, amount_paid), repayments(amount_paid, amount_due, status)"
        )
        .eq("member_id", memberId)
        .or("state.eq.active,state.eq.disbursed");

      if (loansError) {
        console.error("Error fetching loans data:", loansError);
      } else if (loansData) {
        setActiveLoans(loansData as Loan[]);
        // Calculate totals for Active Loans
        const totalActiveLoanAmount = loansData.reduce(
          (sum, loan) => sum + (loan.loan_amount ?? 0),
          0
        );

        // Calculate total repayments made towards active loans
        const totalRepaid = loansData.reduce((sum, loan) => {
          const loanRepaid = loan.repayments
            ? loan.repayments.reduce(
                (rSum: number, r: Repayment) => rSum + (r.amount_paid ?? 0),
                0
              )
            : 0;
          return sum + loanRepaid;
        }, 0);

        const balance = totalActiveLoanAmount - totalRepaid;

        setActiveLoan(totalActiveLoanAmount);
        setCurrentBalance(balance > 0 ? balance : 0);

        // Calculate Pending Interest and Missed Installments for ALL active loans
        let totalPending = 0;
        let totalMissedRepayment = 0;

        loansData.forEach((loan) => {
          const disbursedDate =
            loan.disbursements?.[0]?.created_at || loan.created_at;

          if (disbursedDate) {
            const loanAmount = loan.loan_amount ?? 0;
            const startDue = addMonths(new Date(disbursedDate), 1);
            const tenure = loan.tenure;
            const loanEndDate = addMonths(startDue, tenure);
            const monthlyInterest = (loanAmount * loan.interest_rate) / 100;
            const monthlyPrincipal = tenure > 0 ? loanAmount / tenure : 0;

            // Interest Calculation
            const now = new Date();
            const currentMonthStart = startOfMonth(now);

            let limitDate = addMonths(currentMonthStart, 1);
            if (isBefore(loanEndDate, limitDate)) {
              limitDate = loanEndDate;
            }

            let iterDate = startOfMonth(startDue);
            while (isBefore(iterDate, limitDate)) {
              const isPaid = loan.interest_payments?.some(
                (p: InterestPayment) =>
                  isSameMonth(new Date(p.payment_for_month), iterDate)
              );

              if (!isPaid) {
                totalPending += monthlyInterest;
              }
              iterDate = addMonths(iterDate, 1);
            }

            // Principal Installment Calculation
            // Check how many installments are due based on time
            let dueInstallments = 0;
            let d = new Date(startDue);
            let monthsChecked = 0;

            while (isBefore(d, now) && monthsChecked < tenure) {
              dueInstallments++;
              d = addMonths(d, 1);
              monthsChecked++;
            }

            const expectedRepaid = dueInstallments * monthlyPrincipal;
            const loanRepaid = loan.repayments
              ? loan.repayments.reduce(
                  (rSum: number, r: Repayment) => rSum + (r.amount_paid ?? 0),
                  0
                )
              : 0;

            if (loanRepaid < expectedRepaid) {
              // Use a small tolerance for floating point comparison
              if (expectedRepaid - loanRepaid > 1) {
                totalMissedRepayment += expectedRepaid - loanRepaid;
              }
            }
          }
        });
        setPendingInterest(totalPending);
        setMissedRepayment(totalMissedRepayment);
      }
    } catch (error) {
      console.error("Unexpected error:", error);
    }
  }

  async function fetchInterestHistory() {
    if (!memberId) return;

    const { data: payments, error } = await supabase
      .from("interest_payments")
      .select("*, loans!inner(member_id)")
      .eq("loans.member_id", memberId);

    if (error) {
      console.error("Error fetching interest history:", error);
      setInterestHistory([]);
    } else {
      const history = payments.map((p) => {
        return {
          month: p.payment_for_month
            ? format(new Date(p.payment_for_month), "MMMM, yyyy")
            : "Unknown",
          amount: `N${(p.amount_paid || 0).toLocaleString()}`,
          date: format(new Date(p.payment_date || p.created_at), "dd-MM-yyyy"),
          method: p.payment_method || "Bank Transfer",
          status: "paid", // Assuming all records here are paid
          rawDate: new Date(p.created_at),
        };
      });

      // Sort by date desc
      history.sort((a, b) => {
        const dateA = a.rawDate;
        const dateB = b.rawDate;
        if (isNaN(dateA.getTime())) return 1;
        if (isNaN(dateB.getTime())) return -1;
        return dateB.getTime() - dateA.getTime();
      });

      setInterestHistory(history);
    }
  }

  async function fetchLoanHistory() {
    if (!memberId) return;

    const { data: loans, error } = await supabase
      .from("loans")
      .select(
        `
          *,
          repayments(amount_paid, amount_due, status),
          disbursements(created_at)
      `
      )
      .eq("member_id", memberId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching loan history:", error);
      setLoanHistory([]);
    } else {
      setLoanHistory((loans as Loan[]) || []);
    }
  }

  async function fetchLoanDocuments() {
    setIsLoadingDocuments(true); // Start loading

    if (!memberId) {
      setIsLoadingDocuments(false);
      return;
    }

    try {
      const { data: loans, error } = await supabase
        .from("loans")
        .select("id, created_at, collateral_docs_url, loan_agreement_url")
        .eq("member_id", memberId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching loan documents:", error);
        setLoanDocuments([]); // Ensure it's an empty array on error
        return;
      }

      const documents = (loans || []).flatMap((loan: LoanForDocs) => {
        const docs: LoanDocument[] = [];
        if (loan.collateral_docs_url) {
          docs.push({
            name: "Collateral Document",
            url: loan.collateral_docs_url,
            loanId: loan.id,
            createdAt: loan.created_at,
          });
        }
        if (loan.loan_agreement_url) {
          docs.push({
            name: "Loan Agreement",
            url: loan.loan_agreement_url,
            loanId: loan.id,
            createdAt: loan.created_at,
          });
        }
        return docs;
      });
      setLoanDocuments(documents);
    } catch (error) {
      console.error("Error fetching loan documents:", error);
      setLoanDocuments([]); // Ensure it's an empty array on unexpected error
    } finally {
      setIsLoadingDocuments(false); // End loading
    }
  }

  async function fetchNotes() {
    if (!memberId) return;

    let allNotes: Note[] = [];

    // 1. Fetch from member_notes
    const { data: memberNotes, error: memberNotesError } = await supabase
      .from("member_notes")
      .select("id, note, created_at, created_by_name")
      .eq("member_id", memberId);

    if (memberNotesError) {
      console.error("Error fetching member notes:", memberNotesError);
    } else if (memberNotes) {
      allNotes = allNotes.concat(
        memberNotes.map((n) => ({
          id: n.id,
          note: n.note,
          date: n.created_at,
          created_by_name: n.created_by_name,
          source: "member_notes",
        }))
      );
    }

    // 2. Get loan IDs for the member
    const { data: loans, error: loansError } = await supabase
      .from("loans")
      .select("id")
      .eq("member_id", memberId);

    if (loansError) {
      console.error("Error fetching loans for notes:", loansError);
    } else if (loans && loans.length > 0) {
      const loanIds = loans.map((l) => l.id);

      const { data: disbursementNotes, error: disbursementError } =
        await supabase
          .from("disbursements")
          .select("id, notes, created_at, disbursed_by_name")
          .in("loan_id", loanIds)
          .not("notes", "is", null);

      if (disbursementError)
        console.error("Error fetching disbursement notes:", disbursementError);
      else if (disbursementNotes) {
        allNotes = allNotes.concat(
          disbursementNotes.map((d) => ({
            id: `dis-${d.id}`,
            note: d.notes,
            date: d.created_at,
            created_by_name: d.disbursed_by_name || "System",
            source: "disbursement",
          }))
        );
      }

      const { data: repaymentNotes, error: repaymentError } = await supabase
        .from("payments")
        .select("id, notes, created_at, created_by")
        .in("loan_id", loanIds)
        .not("notes", "is", null);

      if (repaymentError)
        console.error("Error fetching repayment notes:", repaymentError);
      else if (repaymentNotes) {
        allNotes = allNotes.concat(
          repaymentNotes.map((r) => ({
            id: `rep-${r.id}`,
            note: r.notes as string,
            date: r.created_at,
            created_by_name: r.created_by || "System",
            source: "repayment",
          }))
        );
      }

      const { data: interestNotes, error: interestError } = await supabase
        .from("interest_payments")
        .select("id, notes, created_at, created_by_name")
        .in("loan_id", loanIds)
        .not("notes", "is", null);

      if (interestError)
        console.error("Error fetching interest payment notes:", interestError);
      else if (interestNotes) {
        allNotes = allNotes.concat(
          (interestNotes as InterestPayment[]).map((p) => ({
            id: `int-${p.id}`,
            note: p.notes as string,
            date: p.created_at,
            created_by_name: p.created_by_name || "System",
            source: "interest_payment",
          }))
        );
      }
    }

    // 3. Sort and set
    allNotes.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      if (isNaN(dateA.getTime())) return 1;
      if (isNaN(dateB.getTime())) return -1;
      return dateB.getTime() - dateA.getTime();
    });
    setNotes(allNotes);
  }

  async function fetchRecentActivity() {
    setIsLoadingTransactions(true); // Start loading

    if (!memberId) {
      setIsLoadingTransactions(false);
      return;
    }

    try {
      const { data: loans, error: loansError } = await supabase
        .from("loans")
        .select("id")
        .eq("member_id", memberId);

      if (loansError) {
        console.error("Error fetching loans for recent activity:", loansError);
        setAllTransactions([]); // Ensure it's an empty array on error
        setRecentActivity([]);
        return;
      }

      if (!loans || loans.length === 0) {
        setAllTransactions([]);
        setRecentActivity([]);
        return;
      }

      const loanIds = loans.map((l) => l.id);

      let activities: ActivityItem[] = [];

      const { data: interestPayments, error: interestError } = await supabase
        .from("interest_payments")
        .select("id, amount_paid, payment_date, created_at")
        .in("loan_id", loanIds);

      if (interestError)
        console.error(
          "Error fetching interest payments for activity:",
          interestError
        );
      else if (interestPayments) {
        activities = activities.concat(
          interestPayments.map((p) => {
            return {
              id: `int-${p.id}`,
              title: "Interest Payment",
              date: p.payment_date || p.created_at,
              created_at: p.created_at,
              amount: p.amount_paid,
              type: "success",
            };
          })
        );
      }

      const { data: repayments, error: repaymentError } = await supabase
        .from("repayments")
        .select("id, amount_paid, paid_at, updated_at, created_at")
        .in("loan_id", loanIds);

      if (repaymentError)
        console.error(
          "Error fetching repayments for activity:",
          repaymentError
        );
      else if (repayments) {
        activities = activities.concat(
          repayments.map((r) => {
            const activityDate = r.updated_at || r.paid_at || r.created_at;
            return {
              id: `rep-${r.id}`,
              title: "Loan Repayment",
              date: activityDate,
              created_at: activityDate,
              amount: r.amount_paid,
              type: "success",
            };
          })
        );
      }

      const { data: disbursements, error: disbursementError } = await supabase
        .from("disbursements")
        .select("id, disbursement_amount, created_at")
        .in("loan_id", loanIds);

      if (disbursementError)
        console.error(
          "Error fetching disbursements for activity:",
          disbursementError
        );
      else if (disbursements) {
        activities = activities.concat(
          disbursements.map((d) => ({
            id: `dis-${d.id}`,
            title: "Loan Disbursement",
            date: d.created_at,
            created_at: d.created_at,
            amount: d.disbursement_amount,
            type: "danger",
          }))
        );
      }

      activities = activities.filter((a) => a.amount > 0);

      activities.sort((a, b) => {
        const dateA = new Date(a.created_at);
        const dateB = new Date(b.created_at);
        if (isNaN(dateA.getTime())) return 1;
        if (isNaN(dateB.getTime())) return -1;
        return dateB.getTime() - dateA.getTime();
      });

      setAllTransactions(activities);
      setRecentActivity(activities.slice(0, 4));
    } catch (error) {
      console.error("Error fetching recent activity:", error);
      setAllTransactions([]); // Ensure it's an empty array on unexpected error
      setRecentActivity([]);
    } finally {
      setIsLoadingTransactions(false); // End loading
    }
  }

  useEffect(() => {
    const fetchAll = async () => {
      await fetchMember();
      await fetchMemberData();
      await fetchInterestHistory();
      await fetchLoanHistory();
      await fetchLoanDocuments();
      await fetchNotes();
      await fetchRecentActivity();
    };
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberId]);

  // ... rest of the component

  if (loading) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex-1 overflow-auto">
          <div className="p-8 space-y-6">
            {/* Header Skeleton */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-64" />
                </div>
              </div>
              <Skeleton className="h-10 w-32" />
            </div>

            {/* Profile Card Skeleton */}
            <Card className="border-none shadow-sm bg-blue-50/50">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                  <Skeleton className="h-24 w-24 rounded-full border-4 border-white" />
                  <div className="space-y-4 flex-1">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-8 w-48" />
                      <Skeleton className="h-6 w-20 rounded-full" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {Array(5)
                        .fill(0)
                        .map((_, i) => (
                          <Skeleton key={i} className="h-4 w-32" />
                        ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats Grid Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array(4)
                .fill(0)
                .map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-6 flex items-center gap-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-6 w-20" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>

            {/* Tabs Skeleton */}
            <Skeleton className="w-full h-12 rounded-full" />

            {/* Content Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Skeleton className="h-64 rounded-xl" />
              <Skeleton className="h-64 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center bg-gray-50/50">
          <p className="text-muted-foreground">Member not found</p>
        </div>
      </div>
    );
  }

  const fullName = member.name.trim() || "Unknown Member";
  const initials = member.name
    ? member.name.substring(0, 2).toUpperCase()
    : "??";

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="p-8 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  Member Profile
                </h1>
                <p className="text-sm text-muted-foreground">
                  Complete member information and activity history
                </p>
              </div>
            </div>
            <Button
              className="bg-black text-white hover:bg-black/90"
              onClick={() => setEditDialogOpen(true)}
            >
              <Edit className="mr-2 h-4 w-4" /> Edit Profile
            </Button>
          </div>

          {/* Profile Card */}
          <Card className="border-none shadow-sm bg-blue-50/50">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                <Avatar className="h-24 w-24 border-4 border-white shadow-sm">
                  <AvatarFallback className="text-2xl bg-blue-600 text-white">
                    {initials}
                  </AvatarFallback>
                </Avatar>

                <div className="space-y-4 flex-1">
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold">{fullName}</h2>
                    <Badge
                      className={`px-3 py-0.5 rounded-full text-xs font-normal ${
                        member.status === "active"
                          ? "bg-black hover:bg-black text-white"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                    >
                      {member.status || "Unknown"}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-y-2 gap-x-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>ID: {member.member_id || "N/A"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <span>{member.phone || "N/A"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <span>{member.email || "N/A"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>
                        Joined{" "}
                        {member.created_at
                          ? new Date(member.created_at).toLocaleDateString()
                          : "N/A"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 md:col-span-4">
                      <MapPin className="h-4 w-4" />
                      <span>{member.location || "N/A"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                  <Wallet className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Total Interest Paid
                  </p>
                  <p className="text-xl font-bold">
                    {totalInterestPaid !== null ? (
                      `₦${totalInterestPaid.toLocaleString()}`
                    ) : (
                      <Skeleton className="h-6 w-24 mt-1" />
                    )}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Pending Interest
                  </p>
                  <p className="text-xl font-bold">
                    {pendingInterest !== null ? (
                      `₦${pendingInterest.toLocaleString()}`
                    ) : (
                      <Skeleton className="h-6 w-24 mt-1" />
                    )}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                  <Banknote className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Active Loan</p>
                  <p className="text-xl font-bold">
                    {activeLoan !== null ? (
                      `₦${activeLoan.toLocaleString()}`
                    ) : (
                      <Skeleton className="h-6 w-24 mt-1" />
                    )}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <Activity className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Current Balance
                  </p>
                  <p className="text-xl font-bold">
                    {currentBalance !== null ? (
                      `₦${currentBalance.toLocaleString()}`
                    ) : (
                      <Skeleton className="h-6 w-24 mt-1" />
                    )}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Navigation Tabs */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="w-full h-auto bg-gray-100 rounded-4xl p-4 mb-8 grid grid-cols-2 gap-2 md:flex md:items-center md:justify-between md:rounded-full md:p-4">
              {[
                { value: "overview", icon: Activity, label: "Overview" },
                { value: "personal", icon: User, label: "Personal" },
                { value: "interest", icon: DollarSign, label: "Interest Fees" },
                { value: "loans", icon: Briefcase, label: "Loans" },
                {
                  value: "transactions",
                  icon: Activity,
                  label: "Transactions",
                },
                { value: "documents", icon: FileText, label: "Documents" },
                { value: "notes", icon: FileText, label: "Notes" },
              ].map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="rounded-full px-3 py-1 data-[state=active]:!bg-white data-[state=active]:text-black data-[state=active]:shadow-sm text-muted-foreground text-xs font-medium transition-all inline-flex items-center justify-center gap-1.5 h-11 w-full md:w-auto md:mx-8 hover:bg-gray-50 data-[state=active]:hover:bg-white shadow-none border-0 ring-0"
                >
                  <tab.icon className="h-3.5 w-3.5" /> {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Activity */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Activity className="h-4 w-4" /> Recent Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {recentActivity === null ? (
                        <div className="space-y-4">
                          <Skeleton className="h-10 w-full" />
                          <Skeleton className="h-10 w-full" />
                          <Skeleton className="h-10 w-full" />
                          <Skeleton className="h-10 w-full" />
                        </div>
                      ) : recentActivity.length > 0 ? (
                        recentActivity.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className={`mt-1.5 h-2 w-2 rounded-full ${
                                  item.type === "success"
                                    ? "bg-green-500"
                                    : "bg-red-500"
                                }`}
                              />
                              <div>
                                <p className="font-medium text-sm">
                                  {item.title}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(item.date), "dd-MM-yyyy")}
                                </p>
                              </div>
                            </div>
                            <span
                              className={`text-sm font-medium ${
                                item.type === "success"
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {item.type === "success" ? "+" : "-"}₦
                              {item.amount.toLocaleString()}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No recent activity found.
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Active Loan Progress */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Activity className="h-4 w-4" /> Active Loan Progress
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {activeLoans.length > 0 ? (
                      activeLoans.map((loan, i) => {
                        const loanAmount = loan.loan_amount ?? 0;
                        const loanRepaid = loan.repayments
                          ? loan.repayments.reduce(
                              (acc: number, curr: Repayment) =>
                                acc + (curr.amount_paid ?? 0),
                              0
                            )
                          : 0;
                        const remaining = Math.max(0, loanAmount - loanRepaid);
                        const progress =
                          loanAmount > 0 ? (loanRepaid / loanAmount) * 100 : 0;

                        const disbursedDate =
                          loan.disbursements?.[0]?.created_at ||
                          loan.created_at;
                        const startDue = disbursedDate
                          ? addMonths(new Date(disbursedDate), 1)
                          : new Date();
                        const tenure = loan.tenure || 0;

                        let nextDueDate = new Date(startDue);
                        const now = new Date();
                        let monthsCount = 0;

                        while (
                          isBefore(nextDueDate, now) &&
                          monthsCount < tenure
                        ) {
                          nextDueDate = addMonths(nextDueDate, 1);
                          monthsCount++;
                        }

                        const monthlyPrincipal =
                          tenure > 0 ? loanAmount / tenure : 0;

                        return (
                          <div
                            key={loan.id}
                            className={i > 0 ? "pt-6 border-t" : ""}
                          >
                            <div className="space-y-2 mb-6">
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Loan #{loan.id.substring(0, 6)}...</span>
                                <span>Tenure: {tenure} months</span>
                              </div>
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>
                                  Paid: ₦{loanRepaid.toLocaleString()}
                                </span>
                                <span>
                                  Remaining: ₦{remaining.toLocaleString()}
                                </span>
                              </div>
                              <Progress
                                value={progress}
                                className="h-2 bg-gray-100"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">
                                  Loan Disbursement Date
                                </p>
                                <p className="font-medium text-sm">
                                  {disbursedDate
                                    ? format(
                                        new Date(disbursedDate),
                                        "dd-MM-yyyy"
                                      )
                                    : "N/A"}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">
                                  Next Due Date
                                </p>
                                <p className="font-medium text-sm">
                                  {format(nextDueDate, "dd-MM-yyyy")}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">
                                  Monthly Payment (Principal)
                                </p>
                                <p className="font-medium text-sm">
                                  ₦
                                  {Math.ceil(monthlyPrincipal).toLocaleString()}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">
                                  Interest Rate
                                </p>
                                <p className="font-medium text-sm">
                                  {loan.interest_rate}%
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center text-sm text-muted-foreground py-4">
                        No active loans found.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="personal" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <User className="h-4 w-4" /> Personal Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2 md:col-span-1">
                        <p className="text-xs text-muted-foreground">
                          Full Name
                        </p>
                        <p className="text-sm font-medium">{fullName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Member ID
                        </p>
                        <p className="text-sm font-medium">
                          {member.member_id || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Phone Number
                        </p>
                        <p className="text-sm font-medium">
                          {member.phone || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Email</p>
                        <p
                          className="text-sm font-medium truncate"
                          title={member.email || ""}
                        >
                          {member.email || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Join Date
                        </p>
                        <p className="text-sm font-medium">
                          {member.created_at
                            ? new Date(member.created_at).toLocaleDateString()
                            : "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Status</p>
                        <p className="text-sm font-medium capitalize">
                          {member.status || "Active"}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs text-muted-foreground">Address</p>
                        <p className="text-sm font-medium">
                          {member.location || "N/A"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <User className="h-4 w-4" /> Nominee Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <p className="text-xs text-muted-foreground">
                          Nominee Name
                        </p>
                        <p className="text-sm font-medium">
                          {member.nominee_name || "N/A"}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs text-muted-foreground">
                          Phone Number
                        </p>
                        <p className="text-sm font-medium">
                          {member.nominee_phone || "N/A"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {activeLoans.some((l: Loan) => l.third_party_name) && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <User className="h-4 w-4" /> Third Party Borrower
                        Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {activeLoans
                        .filter((l: Loan) => l.third_party_name)
                        .map((loan: Loan, index: number) => (
                          <div
                            key={loan.id}
                            className={index > 0 ? "pt-4 border-t" : ""}
                          >
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-xs text-muted-foreground">
                                  Full Name
                                </p>
                                <p className="text-sm font-medium">
                                  {loan.third_party_name}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">
                                  Phone Number
                                </p>
                                <p className="text-sm font-medium">
                                  {loan.third_party_number || "N/A"}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <User className="h-4 w-4" /> Bank Account Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Account Number
                        </p>
                        <p className="text-sm font-medium">
                          {member.account_number || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Bank Name
                        </p>
                        <p className="text-sm font-medium">
                          {member.bank_name || "N/A"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="interest" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Interest Fee Payment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Month</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Payment Date</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {interestHistory.length > 0 ? (
                        interestHistory.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>{item.month}</TableCell>
                            <TableCell>{item.amount}</TableCell>
                            <TableCell>{item.date}</TableCell>
                            <TableCell>{item.method}</TableCell>
                            <TableCell>
                              <Badge
                                className={`rounded-full px-3 font-normal capitalize ${
                                  item.status === "overdue"
                                    ? "bg-red-600 hover:bg-red-700"
                                    : item.status === "active" ||
                                      item.status === "paid"
                                    ? "bg-black hover:bg-black"
                                    : "bg-gray-200 text-gray-700"
                                }`}
                              >
                                {item.status === "active"
                                  ? "Paid"
                                  : item.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            className="text-center text-muted-foreground py-6"
                          >
                            No interest history found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="loans" className="space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Loan History</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={() => router.push("/loans/applications")}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1.5" /> New Loan
                  </Button>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Loan Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Disbursed</TableHead>
                        <TableHead>Tenure</TableHead>
                        <TableHead>Interest</TableHead>
                        <TableHead>Paid</TableHead>
                        <TableHead>Remaining</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loanHistory.length > 0 ? (
                        loanHistory.map((loan) => {
                          const amount = loan.loan_amount ?? 0;
                          const disbursedDate =
                            loan.disbursements?.[0]?.created_at ||
                            loan.created_at;
                          const paid = loan.amount_paid ?? 0;
                          const remaining = Math.max(0, amount - paid);

                          return (
                            <TableRow key={loan.id}>
                              <TableCell className="font-medium capitalize">
                                {loan.state || "Unknown"}
                              </TableCell>
                              <TableCell>₦{amount.toLocaleString()}</TableCell>
                              <TableCell>
                                {disbursedDate
                                  ? format(
                                      new Date(disbursedDate),
                                      "dd-MM-yyyy"
                                    )
                                  : "N/A"}
                              </TableCell>
                              <TableCell>{loan.tenure} months</TableCell>
                              <TableCell>{loan.interest_rate}%</TableCell>
                              <TableCell>₦{paid.toLocaleString()}</TableCell>
                              <TableCell>
                                ₦{remaining.toLocaleString()}
                              </TableCell>
                              <TableCell>
                                {remaining > 0 && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setLoanToEdit(loan);
                                      setEditLoanDialogOpen(true);
                                    }}
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={7}
                            className="text-center text-muted-foreground py-6"
                          >
                            No loan history found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="transactions" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base mb-4">
                    Transaction History
                  </CardTitle>
                  <div className="flex items-center gap-4">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search transactions..."
                        className="pl-9 bg-muted/50 border-none"
                      />
                    </div>
                    <Select defaultValue="all">
                      <SelectTrigger className="w-[180px] bg-muted/50 border-none">
                        <SelectValue placeholder="All Types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="fee">Fee Payment</SelectItem>
                        <SelectItem value="loan">Loan Repayment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoadingTransactions ? (
                    <div className="space-y-4">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ) : allTransactions.length > 0 ? (
                    <Table className="table-fixed">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[25%]">Type</TableHead>
                          <TableHead className="w-[40%]">Description</TableHead>
                          <TableHead className="w-[15%] text-right">
                            Amount
                          </TableHead>
                          <TableHead className="w-[20%] text-right">
                            Date
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allTransactions.map((item, index) => (
                          <TableRow
                            key={item.id}
                            className={index % 2 === 0 ? "bg-muted/25" : ""}
                          >
                            <TableCell className="font-medium">
                              <Badge
                                variant="outline"
                                className="font-normal capitalize"
                              >
                                {item.id.startsWith("int-")
                                  ? "Interest"
                                  : item.id.startsWith("rep-")
                                  ? "Repayment"
                                  : "Disbursement"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground truncate">
                              {item.title}
                            </TableCell>
                            <TableCell
                              className={`text-sm font-medium text-right ${
                                item.type === "success"
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {`${
                                item.type === "success" ? "+" : "-"
                              }N${item.amount.toLocaleString()}`}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground text-right">
                              {format(new Date(item.date), "dd-MM-yyyy")}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="col-span-2 text-center text-muted-foreground py-10">
                      No transactions found.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documents" className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-medium">Documents</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {isLoadingDocuments ? (
                  <>
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                  </>
                ) : loanDocuments.length > 0 ? (
                  loanDocuments.map((doc, index) => (
                    <Card key={index}>
                      <CardContent className="p-6 flex items-start gap-4">
                        <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                          <FileText className="h-5 w-5 text-red-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium">{doc.name}</h3>
                          <p className="text-xs text-muted-foreground mt-1">
                            Uploaded:{" "}
                            {new Date(doc.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => window.open(doc.url, "_blank")}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => window.open(doc.url, "_blank")}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="col-span-2 text-center text-muted-foreground py-10">
                    No documents found.
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="notes" className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-medium">Member Notes</h2>
                <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9">
                      <Plus className="h-4 w-4 mr-2" /> Add Note
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add a new note</DialogTitle>
                      <DialogDescription>
                        This note will be added to the member&apos;s profile.
                      </DialogDescription>
                    </DialogHeader>
                    <Textarea
                      placeholder="Type your note here."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                    />
                    <DialogFooter>
                      <Button
                        onClick={handleNoteSubmit}
                        disabled={!newNote.trim() || isAddingNote}
                      >
                        {isAddingNote ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          "Save Note"
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="space-y-4">
                {notes.length > 0 ? (
                  notes.map((note, i) => (
                    <Card key={i}>
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                          <div className="space-y-2">
                            <div className="text-xs text-muted-foreground">
                              {new Date(note.date).toLocaleString()}
                            </div>
                            <div className="font-medium text-sm">
                              {note.created_by_name || "System"}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {note.note}
                            </div>
                          </div>
                          {note.source === "member_notes" && (
                            <AlertDialog
                              open={
                                deleteDialogOpen && noteToDelete === note.id
                              }
                              onOpenChange={setDeleteDialogOpen}
                            >
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => {
                                    setNoteToDelete(note.id);
                                    setDeleteDialogOpen(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Are you absolutely sure?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. This will
                                    permanently delete the note.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel
                                    onClick={() => setNoteToDelete(null)}
                                  >
                                    Cancel
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteNote(note.id)}
                                    disabled={isDeletingNote}
                                  >
                                    {isDeletingNote ? (
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                      "Continue"
                                    )}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center text-muted-foreground py-10">
                    No notes found.
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {/* Footer Warning */}
          {((pendingInterest != null && pendingInterest > 0) ||
            missedRepayment > 100) && (
            <div className="flex items-center gap-2 p-4 bg-orange-50 border border-orange-100 rounded-lg text-orange-600 text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>
                {pendingInterest != null &&
                pendingInterest > 0 &&
                missedRepayment > 100
                  ? `This member has pending interest fees (₦${(
                      pendingInterest || 0
                    ).toLocaleString()}) and missed loan installments (₦${missedRepayment.toLocaleString()}). Please follow up.`
                  : pendingInterest != null && pendingInterest > 0
                  ? `This member has pending interest fee payment(s) of ₦${(
                      pendingInterest || 0
                    ).toLocaleString()}. Please follow up.`
                  : `This member has missed loan installment(s) of ₦${missedRepayment.toLocaleString()}. Please follow up.`}
              </span>
            </div>
          )}
        </div>

        {/* Edit Profile Dialog */}
        <EditProfileDialog
          member={member}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSuccess={fetchMember}
        />
        <ExtendLoanModal
          loan={loanToEdit}
          open={editLoanDialogOpen}
          onOpenChange={setEditLoanDialogOpen}
          onSuccess={fetchLoanHistory}
        />
      </div>
    </div>
  );
}
