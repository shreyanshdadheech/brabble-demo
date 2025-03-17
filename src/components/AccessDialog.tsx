"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function AccessDialog() {
  const [formData, setFormData] = useState({
    email: "",
    phone: "",
    businessType: "",
    gstin: "",
    details: ""
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle form submission here
    console.log(formData)
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="link" 
          className=" text-indigo-900 font-semibold  underline 
                     fixed bottom-2 left-1/2 transform -translate-x-1/2 "
        >
          Get Full Access
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] ">
        <DialogHeader>
          <DialogTitle>Request Access</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+91 98765 43210"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="businessType">Business Type</Label>
            <Select 
              value={formData.businessType}
              onValueChange={(value) => setFormData({ ...formData, businessType: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select business type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="retail">Retail</SelectItem>
                <SelectItem value="healthcare">Healthcare</SelectItem>
                <SelectItem value="technology">Technology</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="gstin">GSTIN/CIN (Optional)</Label>
            <Input
              id="gstin"
              placeholder="Enter GSTIN or CIN"
              value={formData.gstin}
              onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="details">Additional Details</Label>
            <Textarea
              id="details"
              placeholder="Tell us more about your business needs..."
              value={formData.details}
              onChange={(e) => setFormData({ ...formData, details: e.target.value })}
            />
          </div>

          <Button type="submit" className="w-full font-thin font-mono text-sm bg-gray-700 text-white">
            Get in Touch
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
