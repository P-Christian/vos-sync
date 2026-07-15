// src/modules/school-admin/request-management/components/CreateCourseRequestModal.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createCourseRequestSchema } from "../types/request.schema";
import { toast } from "sonner";
import { useSchools } from "@/modules/school-admin/school-management";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => Promise<boolean>;
  defaultSchoolId?: number;
  hideSchoolSelect?: boolean;
}

export function CreateCourseRequestModal({ open, onOpenChange, onSubmit, defaultSchoolId, hideSchoolSelect }: Props) {
  const { schools, fetchSchools } = useSchools();
  const [loading, setLoading] = useState(false);

  const form = useForm({
    resolver: zodResolver(createCourseRequestSchema),
    defaultValues: {
      school_id: defaultSchoolId,
      requested_course_name: "",
      requested_course_code: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (!hideSchoolSelect) fetchSchools("Active");
      form.reset({
        school_id: defaultSchoolId,
        requested_course_name: "",
        requested_course_code: "",
      });
    }
  }, [open, fetchSchools, form, defaultSchoolId, hideSchoolSelect]);

  const handleValidSubmit = async (data: any) => {
    setLoading(true);
    const success = await onSubmit(data);
    setLoading(false);

    if (success) {
      toast.success("Course request created successfully.");
      form.reset();
      onOpenChange(false);
    }
  };

  const handleValidationError = (errors: any) => {
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
          <DialogTitle>Add Missing Course Request</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleValidSubmit, handleValidationError)} className="space-y-4 py-4">
            {!hideSchoolSelect && (
              <FormField
                control={form.control}
                name="school_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>School *</FormLabel>
                    <Select onValueChange={(val) => field.onChange(parseInt(val, 10))} value={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a school" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {schools.map(s => (
                          <SelectItem key={s.school_id} value={s.school_id.toString()}>
                            {s.school_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="requested_course_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Proposed Course Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. BS Information Technology" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="requested_course_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Course Code (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. BSIT" {...field} />
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
