"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

interface EditProfileDialogProps {
  member: any
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function EditProfileDialog({ member, open, onOpenChange, onSuccess }: EditProfileDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
  })

  // Reset form data when member changes or dialog opens
  useEffect(() => {
    if (member && open) {
      setFormData({
        name: member?.name || `${member?.first_name || ''} ${member?.last_name || ''}`.trim(),
        email: member?.email || '',
        phone: member?.phone || '',
        address: member?.address || member?.location || '',
      })
    }
  }, [member, open])

  const handleSave = async () => {
    setIsLoading(true)
    try {
      const nameParts = formData.name.trim().split(' ')
      const firstName = nameParts[0]
      const lastName = nameParts.slice(1).join(' ')

      // Prepare updates object
      // Note: mapping 'address' form field to 'location' database column
      // Removed 'updated_at' as the column does not exist
      const updates: any = {
        email: formData.email,
        phone: formData.phone,
        location: formData.address,
      }

      if (member.name !== undefined) {
          updates.name = formData.name
      } else {
          updates.first_name = firstName
          updates.last_name = lastName
      }

      // Use API route to bypass RLS
      const response = await fetch('/api/update-member', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          member_id: member.member_id,
          updates: updates,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Failed to update profile')
      }

      toast.success("Profile updated successfully")
      onOpenChange(false)
      if (onSuccess) onSuccess()
      
    } catch (error: any) {
      console.error('Error updating profile:', error)
      toast.error(error.message || "Failed to update profile")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden gap-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="text-xl font-semibold">Edit Profile</DialogTitle>
          <DialogDescription>
            Update the member's personal information below.
          </DialogDescription>
        </DialogHeader>
        
        <div className="p-6 space-y-6">
          {/* Read-only Info Section - Visual touch from the example */}
          <div className="grid grid-cols-2 gap-6 p-4 bg-muted/30 rounded-lg border border-border/50">
             <div>
                <p className="text-xs text-muted-foreground font-medium mb-1">Member ID</p>
                <p className="text-sm font-semibold text-foreground">{member?.member_id || 'N/A'}</p>
             </div>
             <div>
                <p className="text-xs text-muted-foreground font-medium mb-1">Current Status</p>
                 <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${member?.status === 'active' ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <p className="text-sm font-semibold text-foreground capitalize">{member?.status || 'Unknown'}</p>
                 </div>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium text-muted-foreground">
                Full Name
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-muted/30 border-border/50 focus:bg-background transition-colors h-11"
                placeholder="e.g. Ahmed Rahman"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-muted-foreground">
                Email Address
              </Label>
              <Input
                id="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="bg-muted/30 border-border/50 focus:bg-background transition-colors h-11"
                placeholder="e.g. ahmed@example.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium text-muted-foreground">
                Phone Number
              </Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="bg-muted/30 border-border/50 focus:bg-background transition-colors h-11"
                placeholder="e.g. +234 80 123 4567"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address" className="text-sm font-medium text-muted-foreground">
                Residential Address
              </Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="bg-muted/30 border-border/50 focus:bg-background transition-colors h-11"
                placeholder="e.g. 123 Lagos Street, Abuja"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="p-6 pt-2 bg-muted/10 border-t gap-2 sm:gap-0">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)} 
            disabled={isLoading}
            className="h-10 px-6"
          >
              Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isLoading}
            className="h-10 px-6 bg-black hover:bg-black/90 text-white ml-2"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
