"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "@/components/sidebar"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/utils/supabase/client"

export default function SettingsPage() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  
  // Add User State
  const [isAddUserOpen, setIsAddUserOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  })

  // Delete User State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Annual Data State
  const [totalMembers, setTotalMembers] = useState<string | null>(null)

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/list-users')
      if (!res.ok) throw new Error('Failed to fetch users')
      const data = await res.json()
      setUsers(data)
    } catch (error) {
      console.error(error)
      toast.error("Could not load users")
    } finally {
      setLoading(false)
    }
  }

  const fetchMemberCount = async () => {
    try {
      const { count } = await supabase.from('members').select('*', { count: 'exact', head: true })
      if (count !== null) {
        setTotalMembers(count.toString())
      } else {
        setTotalMembers("0")
      }
    } catch (error) {
      console.error(error)
      setTotalMembers("0")
    }
  }

  useEffect(() => {
    fetchUsers()
    fetchMemberCount()
  }, [])

  const handleDeleteClick = (id: string) => {
    setUserToDelete(id)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!userToDelete) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/delete-user?id=${userToDelete}`, { method: 'DELETE' })
      if (!res.ok) {
         const data = await res.json()
         throw new Error(data.message || 'Failed to delete user')
      }
      toast.success("User deleted successfully")
      // Remove from local state immediately
      setUsers(prev => prev.filter(u => u.id !== userToDelete))
    } catch (error: any) {
      console.error(error)
      toast.error(error.message || "Failed to delete user")
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
      setUserToDelete(null)
    }
  }

  const handleCreateUser = async () => {
    if (!newUser.username || !newUser.email || !newUser.password) {
      toast.error("Please fill in all fields")
      return
    }

    if (newUser.password !== newUser.confirmPassword) {
      toast.error("Passwords do not match")
      return
    }

    if (newUser.password.length < 6) {
      toast.error("Password must be at least 6 characters")
      return
    }

    setIsCreating(true)
    try {
      const res = await fetch('/api/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newUser.email,
          password: newUser.password,
          fullName: newUser.username
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || 'Failed to create user')
      }

      toast.success("User created successfully")
      setIsAddUserOpen(false)
      setNewUser({ username: '', email: '', password: '', confirmPassword: '' })
      fetchUsers() // Refresh list
    } catch (error: any) {
      console.error(error)
      toast.error(error.message || "Failed to create user")
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="p-8 space-y-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
            <p className="text-muted-foreground">
              Manage system configuration and preferences
            </p>
          </div>

          <Tabs defaultValue="users" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-muted/50 rounded-full h-16 p-2">
              <TabsTrigger 
                value="users" 
                className="rounded-full h-full data-[state=active]:bg-white data-[state=active]:!bg-white data-[state=active]:text-foreground text-muted-foreground transition-all border-0 shadow-none ring-0 scale-95 data-[state=active]:scale-85"
              >
                Users
              </TabsTrigger>
              <TabsTrigger 
                value="annual-data"
                className="rounded-full h-full data-[state=active]:bg-white data-[state=active]:!bg-white data-[state=active]:text-foreground text-muted-foreground transition-all border-0 shadow-none ring-0 scale-95 data-[state=active]:scale-85"
              >
                Annual Data
              </TabsTrigger>
            </TabsList>

            <TabsContent value="users" className="space-y-4 mt-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
                  <CardTitle className="text-lg font-medium">User Management</CardTitle>
                  <Button 
                    className="bg-black text-white hover:bg-black/90"
                    onClick={() => setIsAddUserOpen(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" /> Add User
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {loading ? (
                    <div className="space-y-4">
                      {Array(5).fill(0).map((_, i) => (
                        <div key={i} className="flex items-center justify-between p-4 rounded-lg border bg-card">
                          <div className="flex items-center gap-4">
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <div className="space-y-2">
                              <Skeleton className="h-4 w-32" />
                              <Skeleton className="h-3 w-48" />
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <Skeleton className="h-8 w-8 rounded-md" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : users.length === 0 ? (
                     <div className="text-center py-8 text-muted-foreground text-sm">
                        No users found
                     </div>
                  ) : (
                    users.map((user) => (
                      <div 
                        key={user.id} 
                        className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <Avatar className="h-10 w-10 bg-muted">
                            <AvatarFallback className="bg-gray-200 text-gray-500 font-medium">
                              {(user.name || user.email || '??').substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{user.name}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          {/* Badge Removed */}
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-muted-foreground hover:text-red-500"
                            onClick={() => handleDeleteClick(user.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="annual-data" className="mt-8">
              <Card>
                <CardHeader>
                  <CardTitle>Data Statistics Annually</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-8 py-8 text-center">
                    <div>
                      {totalMembers === null ? (
                        <Skeleton className="h-10 w-24 mx-auto mb-2" />
                      ) : (
                        <p className="text-4xl font-bold">{totalMembers}</p>
                      )}
                      <p className="text-sm text-muted-foreground mt-2">Members</p>
                    </div>
                    <div>
                      <p className="text-4xl font-bold">1300</p>
                      <p className="text-sm text-muted-foreground mt-2">Transactions</p>
                    </div>
                    <div>
                      <p className="text-4xl font-bold">45</p>
                      <p className="text-sm text-muted-foreground mt-2">Loans</p>
                    </div>
                    <div>
                      <p className="text-4xl font-bold">N6.5M</p>
                      <p className="text-sm text-muted-foreground mt-2">Total Loan</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
        <DialogContent className="sm:max-w-[700px] p-8">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Add New User</DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium">Username</Label>
              <Input
                id="username"
                placeholder="Admin User 3"
                className="bg-muted/50 border-0 h-11"
                value={newUser.username}
                onChange={(e) => setNewUser({...newUser, username: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@gloryhouse.com"
                className="bg-muted/50 border-0 h-11"
                value={newUser.email}
                onChange={(e) => setNewUser({...newUser, email: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="*********"
                className="bg-muted/50 border-0 h-11"
                value={newUser.password}
                onChange={(e) => setNewUser({...newUser, password: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="*********"
                className="bg-muted/50 border-0 h-11"
                value={newUser.confirmPassword}
                onChange={(e) => setNewUser({...newUser, confirmPassword: e.target.value})}
              />
            </div>
          </div>

          <DialogFooter className="gap-3 sm:justify-end">
            <Button 
              variant="outline" 
              onClick={() => setIsAddUserOpen(false)}
              className="h-10 px-6 border hover:bg-muted"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateUser}
              disabled={isCreating}
              className="h-10 px-6 bg-black hover:bg-black/90 text-white"
            >
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm New User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this user? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handleConfirmDelete();
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
