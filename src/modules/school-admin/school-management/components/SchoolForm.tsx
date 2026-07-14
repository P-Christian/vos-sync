// src/modules/school-admin/school-management/components/SchoolForm.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createSchoolSchema } from "../types/school.schema";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VsSchool } from "../types/school.types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => Promise<VsSchool | null>;
  initialData?: VsSchool | null;
}

export function SchoolForm({ open, onOpenChange, onSubmit, initialData }: Props) {
  const [loading, setLoading] = useState(false);

  const form = useForm({
    resolver: zodResolver(createSchoolSchema),
    defaultValues: {
      school_name: initialData?.school_name || "",
      school_type: initialData?.school_type || "University",
      school_logo_url: initialData?.school_logo_url || "",
      school_email: initialData?.school_email || "",
      school_contact_no: initialData?.school_contact_no || "",
      city_municipality: initialData?.city_municipality || "",
      province: initialData?.province || "",
      address_line: initialData?.address_line || "",
      school_status: initialData?.school_status || "Active",
      school_description: initialData?.school_description || "",
    },
  });

  useEffect(() => {
    if (open) {
      if (initialData) {
        form.reset({
          school_name: initialData.school_name || "",
          school_type: initialData.school_type || "University",
          school_logo_url: initialData.school_logo_url || "",
          school_email: initialData.school_email || "",
          school_contact_no: initialData.school_contact_no || "",
          city_municipality: initialData.city_municipality || "",
          province: initialData.province || "",
          address_line: initialData.address_line || "",
          school_status: initialData.school_status || "Active",
          school_description: initialData.school_description || "",
        });
      } else {
        form.reset({
          school_name: "",
          school_type: "University",
          school_logo_url: "",
          school_email: "",
          school_contact_no: "",
          city_municipality: "",
          province: "",
          address_line: "",
          school_status: "Active",
          school_description: "",
        });
      }
    }
  }, [initialData, open, form]);

  const handleValidSubmit = async (data: any) => {
    setLoading(true);
    const result = await onSubmit(data);
    setLoading(false);
    if (result) {
      form.reset();
      onOpenChange(false);
    }
  };

  const handleValidationError = (errors: any) => {
    // Get the first error message and show it in a toast
    const firstErrorKey = Object.keys(errors)[0];
    if (firstErrorKey && errors[firstErrorKey]?.message) {
      toast.error(errors[firstErrorKey].message);
    } else {
      toast.error("Please check the form for errors.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit School" : "Add New School"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleValidSubmit, handleValidationError)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="school_name"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>School Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter school name" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="school_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>School Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="University">University</SelectItem>
                        <SelectItem value="College">College</SelectItem>
                        <SelectItem value="Technical/Vocational">Technical/Vocational</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="school_status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="school_logo_url"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>School Logo URL (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com/logo.png" type="url" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="city_municipality"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City / Municipality</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Quezon City" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="province"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Province</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Metro Manila" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address_line"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Full Address</FormLabel>
                    <FormControl>
                      <Input placeholder="Street, Building, etc." {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="school_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input placeholder="info@school.edu" type="email" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="school_contact_no"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact No.</FormLabel>
                    <FormControl>
                      <Input placeholder="(02) 8123-4567" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="school_description"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Brief details about the school..." {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

            </div>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Save School"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
