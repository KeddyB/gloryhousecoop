"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/router"

interface ViewProfileDialogProps {
  member: any
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ViewProfileDialog({ member, open, onOpenChange }: ViewProfileDialogProps) {
  const router = useRouter()
  
  if (!member) return null

  const fullName = member.name || `${member.first_name || ''} ${member.last_name || ''}`.trim()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden gap-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="text-xl font-semibold">Member Details</DialogTitle>
          <DialogDescription>
            Quick view of member information.
          </DialogDescription>
        </DialogHeader>
        
        <div className="p-6 space-y-6">
          {/* Header Info */}
          <div className="grid grid-cols-2 gap-6 p-4 bg-muted/30 rounded-lg border border-border/50">
             <div>
                <p className="text-xs text-muted-foreground font-medium mb-1">Member ID</p>
                <p className="text-sm font-semibold text-foreground">{member.member_id || 'N/A'}</p>
             </div>
             <div>
                <p className="text-xs text-muted-foreground font-medium mb-1">Current Status</p>
                 <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${member.status === 'active' ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <p className="text-sm font-semibold text-foreground capitalize">{member.status || 'Unknown'}</p>
                 </div>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-muted-foreground">Full Name</Label>
              <p className="text-sm font-medium">{fullName}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-muted-foreground">Email Address</Label>
              <p className="text-sm font-medium">{member.email || 'N/A'}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-muted-foreground">Phone Number</Label>
              <p className="text-sm font-medium">{member.phone || 'N/A'}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-muted-foreground">Residential Address</Label>
              <p className="text-sm font-medium">{member.address || member.location || 'N/A'}</p>
            </div>
          </div>
          
           <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-muted-foreground">Joined Date</Label>
              <p className="text-sm font-medium">{member.created_at ? new Date(member.created_at).toLocaleDateString() : 'N/A'}</p>
            </div>
          </div>
        </div>

        <DialogFooter className="p-6 pt-2 bg-muted/10 border-t gap-2 sm:gap-0">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)} 
            className="h-10 px-6"
          >
              Close
          </Button>
          <Button 
            onClick={() => router.push(`/members/${member.member_id}`)}
            className="h-10 px-6 bg-black hover:bg-black/90 text-white ml-2"
          >
            View Full Profile
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
