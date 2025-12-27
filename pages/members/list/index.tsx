"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/router"
import { Sidebar } from "@/components/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Users,
  UserCheck,
  UserX,
  Search,
  Eye,
  Pencil,
  Trash2,
  Plus,
  Phone,
  Mail,
  MapPin,
} from "lucide-react"
import { createClient } from '@/utils/supabase/client';
import { Skeleton } from "@/components/ui/skeleton"

export default function MembersListPage() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchMembers() {
      try {
        const { data, error } = await supabase
          .from('members')
          .select('*')
        
        if (error) {
          console.error('Error fetching members:', error)
        } else {
          setMembers(data || [])
        }
      } catch (error) {
        console.error('Unexpected error:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchMembers()
  }, [])

  const filteredMembers = members.filter(member => {
    // 1. Filter by status
    if (statusFilter !== "all" && member.status !== statusFilter) {
      return false
    }

    // 2. Filter by search term
    const firstName = member.first_name || '';
    const lastName = member.last_name || '';
    const name = member.name || '';
    const searchLower = searchTerm.toLowerCase();
    
    return (
      firstName.toLowerCase().includes(searchLower) || 
      lastName.toLowerCase().includes(searchLower) || 
      name.toLowerCase().includes(searchLower) ||
      member.email?.toLowerCase().includes(searchLower) ||
      member.phone?.includes(searchTerm)
    );
  });

  const totalMembers = members.length
  const activeMembers = members.filter(m => m.status === 'active').length
  const inactiveMembers = members.filter(m => m.status === 'inactive').length

  const handleRowClick = (memberId: string) => {
    router.push(`/members/${memberId}`)
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="p-8 space-y-8">
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Member Management</h1>
              <p className="text-muted-foreground">
                Manage all society members and their information
              </p>
            </div>
            <Button className="bg-black text-white hover:bg-black/90" onClick={() => router.push('/members/add')}>
              <Plus className="mr-2 h-4 w-4" /> Add New Member
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {loading ? <Skeleton className="h-4 w-24" /> : 
                      i === 1 ? 'Total Members' : i === 2 ? 'Active Members' : 'Inactive Members'}
                  </CardTitle>
                  {loading ? <Skeleton className="h-6 w-6 rounded-full" /> : 
                    i === 1 ? <Users className="h-6 w-6 text-sky-500" /> : 
                    i === 2 ? <UserCheck className="h-6 w-6 text-green-500" /> : 
                    <UserX className="h-6 w-6 text-orange-500" />}
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {loading ? <Skeleton className="h-8 w-12 mt-2" /> : 
                      i === 1 ? totalMembers : i === 2 ? activeMembers : inactiveMembers}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Member List Card */}
          <Card>
            <CardHeader>
              <CardTitle>Member List</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Filter Section */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, phone or email..."
                    className="pl-9 bg-muted/50 border-none"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select defaultValue="all" onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px] bg-muted/50 border-none">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="w-1/5 text-center">Member List</TableHead>
                      <TableHead className="w-1/5 text-center">Contact</TableHead>
                      <TableHead className="w-1/5 text-center">Join Date</TableHead>
                      <TableHead className="w-1/5 text-center">Status</TableHead>
                      <TableHead className="w-1/5 text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                       // Skeleton Rows
                       Array(5).fill(0).map((_, index) => (
                         <TableRow key={index}>
                           <TableCell>
                              <div className="flex items-center justify-center gap-3">
                                <Skeleton className="h-10 w-10 rounded-full" />
                                <div className="space-y-2">
                                  <Skeleton className="h-4 w-32" />
                                  <Skeleton className="h-3 w-20" />
                                </div>
                              </div>
                           </TableCell>
                           <TableCell>
                             <div className="flex flex-col items-center gap-2">
                               <Skeleton className="h-3 w-28" />
                               <Skeleton className="h-3 w-32" />
                             </div>
                           </TableCell>
                           <TableCell>
                             <div className="flex flex-col items-center gap-2">
                               <Skeleton className="h-4 w-24" />
                               <Skeleton className="h-3 w-20" />
                             </div>
                           </TableCell>
                           <TableCell>
                             <div className="flex justify-center">
                               <Skeleton className="h-6 w-20 rounded-full" />
                             </div>
                           </TableCell>
                           <TableCell>
                             <div className="flex justify-center gap-2">
                               <Skeleton className="h-10 w-10 rounded-md" />
                               <Skeleton className="h-10 w-10 rounded-md" />
                               <Skeleton className="h-10 w-10 rounded-md" />
                             </div>
                           </TableCell>
                         </TableRow>
                       ))
                    ) : filteredMembers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-4">No members found</TableCell>
                        </TableRow>
                    ) : (
                    filteredMembers.map((member) => (
                      <TableRow 
                        key={member.id} 
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => handleRowClick(member.member_id)}
                      >
                        <TableCell>
                          <div className="flex items-center justify-center gap-3">
                            <Avatar className="h-10 w-10 bg-muted">
                              <AvatarFallback>
                                {(member.first_name && member.last_name) 
                                  ? `${member.first_name.charAt(0)}${member.last_name.charAt(0)}` 
                                  : (member.name ? member.name.substring(0, 2).toUpperCase() : '??')}
                              </AvatarFallback>
                            </Avatar>
                            <div className="text-left">
                              <div className="font-medium text-base">
                                {member.name || `${member.first_name} ${member.last_name}`}
                              </div>
                              <div className="text-sm text-muted-foreground">{member.member_id}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Phone className="h-4 w-4" />
                              <span>{member.phone}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Mail className="h-4 w-4" />
                              <span>{member.email}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-base font-medium">{member.created_at ? new Date(member.created_at).toLocaleDateString() : 'N/A'}</span>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <MapPin className="h-4 w-4" />
                              <span>{member.address || member.location}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-center">
                            <Badge 
                              variant="secondary" 
                              className={`rounded-full px-4 py-1 font-normal text-sm ${
                                member.status === 'active' 
                                  ? 'bg-black text-white hover:bg-black/90' 
                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                              }`}
                            >
                              {member.status || 'Unknown'}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-10 w-10 text-sky-500 hover:text-sky-600 hover:bg-sky-50">
                              <Eye className="h-5 w-5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-10 w-10 text-green-500 hover:text-green-600 hover:bg-green-50">
                              <Pencil className="h-5 w-5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-10 w-10 text-red-500 hover:text-red-600 hover:bg-red-50">
                              <Trash2 className="h-5 w-5" />
                            </Button>
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
  )
}
