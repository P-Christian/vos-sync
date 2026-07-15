// src/modules/school-admin/request-management/components/CreateSchoolRequestModal.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createSchoolRequestSchema } from "../types/request.schema";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: unknown) => Promise<boolean>;
}

export function CreateSchoolRequestModal({ open, onOpenChange, onSubmit }: Props) {
  const [loading, setLoading] = useState(false);

  const form = useForm({
    resolver: zodResolver(createSchoolRequestSchema),
    defaultValues: {
      requested_school_name: "",
      city_municipality: "",
      province: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        requested_school_name: "",
        city_municipality: "",
        province: "",
      });
    }
  }, [open, form]);

  const handleValidSubmit = async (data: unknown) => {
    setLoading(true);
    const success = await onSubmit(data);
    setLoading(false);

    if (success) {
      toast.success("School request created successfully.");
      form.reset();
      onOpenChange(false);
    }
  };

  const handleValidationError = (errors: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => {
    const firstErrorKey = Object.keys(errors)[0];
    if (firstErrorKey && errors[firstErrorKey]?.message) {
      toast.error(errors[firstErrorKey].message);
    } else {
      toast.error("Please check the form for errors.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Missing School Request</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleValidSubmit, handleValidationError)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="requested_school_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Proposed School Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Adamson University" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="city_municipality"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City / Municipality (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Manila" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="province"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Province (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Metro Manila" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Submit Request"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
