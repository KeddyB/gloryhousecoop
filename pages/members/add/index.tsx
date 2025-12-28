'use client'

import { useState } from "react"
import { useRouter } from "next/router"
import { Sidebar } from "@/components/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import ErrorBoundary from "@/components/ErrorBoundary"
import {
  ArrowLeft,
  User,
  Users,
  Banknote,
  CheckCircle,
  ArrowRight,
  AlertCircle
} from "lucide-react"
import { createClient } from "@/utils/supabase/client"

const steps = [
  { id: 1, name: 'Personal Information', icon: User, fields: ['full_name', 'phone', 'email', 'location'] },
  { id: 2, name: 'Nominee Details', icon: Users, fields: [] }, // No required fields
  { id: 3, name: 'Bank Information', icon: Banknote, fields: ['account_number', 'bank_name'] },
];

export default function AddMemberPage() {
  return (
    <ErrorBoundary>
      <AddMemberForm />
    </ErrorBoundary>
  )
}

function AddMemberForm() {
  const router = useRouter()
  const supabase = createClient()
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, boolean>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    location: '',
    nominee_name: '',
    nominee_phone: '',
    account_number: '',
    bank_name: '',
  });

  const validateStep = (step: number) => {
    const newErrors: Record<string, boolean> = {};
    const stepConfig = steps.find(s => s.id === step);
    let isValid = true;

    if (stepConfig && stepConfig.fields.length > 0) {
        for (const field of stepConfig.fields) {
            if (!formData[field as keyof typeof formData]) {
                newErrors[field] = true;
                isValid = false;
            }
        }
    }

    setErrors(prev => ({...prev, ...newErrors}));

    if (!isValid) {
        setFormError("Please fill in all required fields marked with *");
    } else {
        setFormError(null);
    }
    return isValid;
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < steps.length) {
        setCurrentStep(currentStep + 1);
      }
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setFormError(null);
      setFormSuccess(null);
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: false }));
    }
  }

  const handleSubmit = async () => {
    const isStep1Valid = validateStep(1);
    const isStep3Valid = validateStep(3);

    if (!isStep1Valid || !isStep3Valid) {
        if (!isStep1Valid) setCurrentStep(1);
        else if (!isStep3Valid) setCurrentStep(3);
        return;
    }

    setLoading(true);
    setFormError(null);
    setFormSuccess(null);

    try {
      const { data: existingMembers, error: checkError } = await supabase
        .from('members')
        .select('phone, email')
        .or(`phone.eq.${formData.phone},email.eq.${formData.email}`);

      if (checkError) {
        setFormError('An error occurred while validating details.');
        setLoading(false);
        return;
      }

      if (existingMembers && existingMembers.length > 0) {
        const duplicate = existingMembers[0];
        if (duplicate.phone === formData.phone) {
          setFormError('A member with this phone number already exists.');
        } else {
          setFormError('A member with this email address already exists.');
        }
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('members')
        .insert([{
          name: formData.full_name,
          phone: formData.phone,
          email: formData.email,
          location: formData.location,
          nominee_name: formData.nominee_name || null,
          nominee_phone: formData.nominee_phone || null,
          account_number: formData.account_number,
          bank_name: formData.bank_name,
          status: 'inactive', // Default status is now inactive
        }])
        .select()
        .single();

      if (error) {
        setFormError(`Failed to create member: ${error.message}`);
      } else {
        setFormSuccess("Member created successfully! You will be redirected shortly.");
        setTimeout(() => {
          router.push('/members/list');
        }, 2000);
      }
    } catch (err) {
      setFormError('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  }

  const progress = ((currentStep - 1) / (steps.length - 1)) * 100;

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 overflow-auto bg-gray-50/50">
        <div className="p-8 space-y-8">

          {/* Header */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Add New Member</h1>
              <p className="text-sm text-muted-foreground">Register a new member to the society</p>
            </div>
          </div>

          {/* Progress Bar and Steps */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium">Registration Process</h3>
                <span className="text-xs text-muted-foreground">{currentStep} of {steps.length}</span>
              </div>
              <Progress value={progress} className="h-2 mb-6" />
              
              <div className="flex justify-between">
                {steps.map((step) => {
                  const isActive = currentStep === step.id;
                  const isCompleted = currentStep > step.id;
                  const Icon = step.icon;
                  
                  return (
                    <div key={step.id} className={cn(`flex items-center gap-2 text-sm font-medium`, {
                        'text-primary': isActive || isCompleted,
                        'text-muted-foreground': !isActive && !isCompleted
                    })}>
                      {isCompleted ? <CheckCircle className="h-5 w-5 text-primary" /> : 
                        <div className={cn(`h-5 w-5 rounded-full flex items-center justify-center border-2`, {
                            'border-primary': isActive,
                            'border-gray-300': !isActive
                        })}>
                            <Icon className={cn(`h-3 w-3`, { 'text-primary': isActive, 'text-gray-400': !isActive })} />
                        </div>
                      }
                      <span>{step.name}</span>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Form Content */}
          <Card>
            <CardContent className="p-6">
                {currentStep === 1 && (
                    <div>
                        <h3 className="text-base font-semibold mb-6">Personal Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label htmlFor="full_name" className="text-sm font-medium">Full Name *</label>
                                <Input id="full_name" name="full_name" placeholder="Enter Full name" value={formData.full_name} onChange={handleChange} className={cn({ 'border-red-500': errors.full_name })} />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="phone" className="text-sm font-medium">Phone Number *</label>
                                <Input id="phone" name="phone" placeholder="+234 1XXX-XXXXX" value={formData.phone} onChange={handleChange} className={cn({ 'border-red-500': errors.phone })} />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="email" className="text-sm font-medium">Email Address *</label>
                                <Input id="email" name="email" type="email" placeholder="name@example.com" value={formData.email} onChange={handleChange} className={cn({ 'border-red-500': errors.email })} />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="location" className="text-sm font-medium">Location *</label>
                                <Input id="location" name="location" placeholder="City, State" value={formData.location} onChange={handleChange} className={cn({ 'border-red-500': errors.location })} />
                            </div>
                        </div>
                    </div>
                )}

                {currentStep === 2 && (
                     <div>
                        <h3 className="text-base font-semibold mb-6">Nominee Details (Optional)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label htmlFor="nominee_name" className="text-sm font-medium">Nominee Name</label>
                                <Input id="nominee_name" name="nominee_name" placeholder="Enter Full name" value={formData.nominee_name} onChange={handleChange} />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="nominee_phone" className="text-sm font-medium">Nominee Phone Number</label>
                                <Input id="nominee_phone" name="nominee_phone" placeholder="+234 1XXX-XXXXX" value={formData.nominee_phone} onChange={handleChange} />
                            </div>
                        </div>
                    </div>
                )}

                {currentStep === 3 && (
                     <div>
                        <h3 className="text-base font-semibold mb-6">Bank Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label htmlFor="account_number" className="text-sm font-medium">Account Number *</label>
                                <Input id="account_number" name="account_number" placeholder="Enter account number" value={formData.account_number} onChange={handleChange} className={cn({ 'border-red-500': errors.account_number })} />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="bank_name" className="text-sm font-medium">Bank Name *</label>
                                <Input id="bank_name" name="bank_name" placeholder="Enter bank name" value={formData.bank_name} onChange={handleChange} className={cn({ 'border-red-500': errors.bank_name })} />
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
          </Card>

           {/* Notifications */}
           {formError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    <span>{formError}</span>
                </div>
            )}
           {formSuccess && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-600 text-sm">
                    <CheckCircle className="h-4 w-4" />
                    <span>{formSuccess}</span>
                </div>
            )}

           {/* Navigation Buttons */}
           <div className="flex justify-between items-center">
                <Button variant="outline" onClick={handlePrevious} disabled={currentStep === 1 || loading}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Previous
                </Button>
                {currentStep < steps.length ? (
                    <Button onClick={handleNext} className="bg-black text-white hover:bg-black/90">
                        Next <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                ) : (
                    <Button onClick={handleSubmit} className="bg-black text-white hover:bg-black/90" disabled={loading}>
                        {loading ? 'Saving...' : (formSuccess ? 'Success!' : 'Finish')}
                    </Button>
                )}
            </div>

        </div>
      </div>
    </div>
  )
}
