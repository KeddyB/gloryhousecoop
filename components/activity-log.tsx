"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { Loader2, User as UserIcon } from "lucide-react";
import { DateRange } from "react-day-picker";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";

const supabase = createClient();
const PAGE_SIZE = 50;

interface ActivityMetadata {
  [key: string]: string | number | boolean | null | undefined;
}

interface Activity {
  id: string;
  activity: string;
  perpetuator: string;
  member: string | null;
  metadata: ActivityMetadata;
  created_at: string;
}

export function ActivityLog() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  // Filters
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [availableUsers, setAvailableUsers] = useState<
    { id: string; name: string }[]
  >([]);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/list-users");
      if (res.ok) {
        const data = await res.json();
        setAvailableUsers(data);
      }
    } catch (error) {
      console.error("Failed to fetch users for filter:", error);
    }
  }, []);

  const fetchActivities = useCallback(
    async (pageNum: number, isMore: boolean = false) => {
      if (!isMore) setLoading(true);
      else setLoadingMore(true);

      try {
        let query = supabase
          .from("activity_log")
          .select("*")
          .order("created_at", { ascending: false })
          .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

        if (selectedUser !== "all") {
          query = query.eq("perpetuator", selectedUser);
        }

        if (dateRange?.from) {
          query = query.gte("created_at", dateRange.from.toISOString());
        }

        if (dateRange?.to) {
          const endOfDay = new Date(dateRange.to);
          endOfDay.setHours(23, 59, 59, 999);
          query = query.lte("created_at", endOfDay.toISOString());
        }

        const { data, error } = await query;

        if (error) throw error;

        if (data) {
          if (isMore) {
            setActivities((prev) => [...prev, ...data]);
          } else {
            setActivities(data);
          }
          setHasMore(data.length === PAGE_SIZE);
        }
      } catch (error) {
        console.error("Error fetching activities:", error);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [dateRange, selectedUser]
  );

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    setPage(0);
    fetchActivities(0, false);
  }, [dateRange, selectedUser, fetchActivities]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchActivities(nextPage, true);
  };

  const formatDetails = (activity: string, metadata: ActivityMetadata) => {
    if (!metadata) return "-";

    switch (activity) {
      case "Loan Disbursed":
      case "Payment Recorded":
        return metadata.amount
          ? `Amount: ₦${Number(metadata.amount).toLocaleString()}`
          : "-";
      case "Loan Application Submitted":
        return `Amount: ₦${Number(
          metadata.amount
        ).toLocaleString()} | Tenure: ${metadata.tenure} months`;
      case "Interest Payment Recorded":
        return `Amount: ₦${Number(metadata.amount).toLocaleString()} | Month: ${
          metadata.month || "-"
        }`;
      case "Note Added":
        return metadata.note_preview
          ? `Preview: ${metadata.note_preview}...`
          : "-";
      default:
        return "-";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-6 bg-muted/30 p-4 rounded-xl border border-border/50">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
          <DatePickerWithRange date={dateRange} setDate={setDateRange} />
        </div>

        <div className="h-4 w-px bg-border hidden md:block" />

        <div className="flex items-center gap-2">
          <UserIcon className="h-4 w-4 text-muted-foreground" />
          <Select value={selectedUser} onValueChange={setSelectedUser}>
            <SelectTrigger className="w-45 bg-white border-0">
              <SelectValue placeholder="All Users" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              {availableUsers.map((u) => (
                <SelectItem key={u.id} value={u.name}>
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border rounded-xl bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="font-semibold">Activity</TableHead>
              <TableHead className="font-semibold">Member</TableHead>
              <TableHead className="font-semibold">Details</TableHead>
              <TableHead className="font-semibold">Performed By</TableHead>
              <TableHead className="font-semibold">Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-[140px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-[100px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-[180px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-[120px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-[120px]" />
                  </TableCell>
                </TableRow>
              ))
            ) : activities.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-32 text-center text-muted-foreground"
                >
                  No activities found matching your filters
                </TableCell>
              </TableRow>
            ) : (
              activities.map((item) => (
                <TableRow
                  key={item.id}
                  className="hover:bg-accent/5 transition-colors"
                >
                  <TableCell className="font-medium">{item.activity}</TableCell>
                  <TableCell>{item.member || "-"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDetails(item.activity, item.metadata)}
                  </TableCell>
                  <TableCell>{item.perpetuator}</TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(item.created_at), "MMM d, yyyy • HH:mm")}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {hasMore && !loading && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={loadMore}
            disabled={loadingMore}
            className="rounded-full px-8"
          >
            {loadingMore ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              "Load More"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
