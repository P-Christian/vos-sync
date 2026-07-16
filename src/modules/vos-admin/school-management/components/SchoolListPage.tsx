// src/modules/vos-admin/school-management/components/SchoolListPage.tsx
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search, Building2, MoreHorizontal } from "lucide-react";
import { useSchools } from "../hooks/useSchools";
import { SchoolTableSkeleton } from "./SchoolTableSkeleton";
import { SchoolStatusBadge } from "./SchoolStatusBadge";
import { SchoolForm } from "./SchoolForm";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

export function SchoolListPage() {
  const {
    schools,
    loading,
    fetchSchools,
    createSchool,
    updateSchool,
    toggleStatus,
  } = useSchools();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<any /* eslint-disable-line @typescript-eslint/no-explicit-any */>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  useEffect(() => {
    fetchSchools(statusFilter, searchTerm);
  }, [fetchSchools, statusFilter, searchTerm]);

  const handleCreateNew = () => {
    setEditingSchool(null);
    setIsFormOpen(true);
  };

  const handleEdit = (school: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => {
    setEditingSchool(school);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (data: unknown) => {
    let result;
    if (editingSchool) {
      result = await updateSchool((editingSchool as {school_id: number}).school_id, data);
      if (result) toast.success("School updated successfully!");
      else toast.error("Failed to update school. Please try again.");
    } else {
      result = await createSchool(data);
      if (result) toast.success("School created successfully!");
      else toast.error("Failed to create school. Please try again.");
    }
    return result;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Schools</h1>
          <p className="text-muted-foreground">Manage the official list of educational institutions.</p>
        </div>
        <Button onClick={handleCreateNew}>
          <Plus className="mr-2 h-4 w-4" /> Add School
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search schools..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="ALL">All Status</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
      </div>

      {loading ? (
        <SchoolTableSkeleton />
      ) : (
        <div className="rounded-md border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left font-medium text-muted-foreground">
                <th className="p-4">School</th>
                <th className="p-4">Type</th>
                <th className="p-4">Location</th>
                <th className="p-4">Courses</th>
                <th className="p-4">Status</th>
                <th className="p-4 w-[50px]"></th>
              </tr>
            </thead>
            <tbody>
              {schools.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    No schools found.
                  </td>
                </tr>
              ) : (
                schools.map((school) => (
                  <tr key={school.school_id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-muted">
                          {school.school_logo_url ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={school.school_logo_url} alt={school.school_name} className="h-full w-full object-cover rounded-lg" />
                          ) : (
                            <Building2 className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <Link href={`/vos-sync/vos-admin/schools/${school.school_id}`} className="font-medium hover:underline">
                            {school.school_name}
                          </Link>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">{school.school_type}</td>
                    <td className="p-4">{school.city_municipality}, {school.province}</td>
                    <td className="p-4">{school.course_count}</td>
                    <td className="p-4">
                      <SchoolStatusBadge status={school.school_status} />
                    </td>
                    <td className="p-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/vos-sync/vos-admin/schools/${school.school_id}`}>
                              View Profile
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(school)}>
                            Edit Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleStatus(school.school_id, school.school_status)}>
                            {school.school_status === "Active" ? "Deactivate" : "Activate"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <SchoolForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleFormSubmit}
        initialData={editingSchool as any /* eslint-disable-line @typescript-eslint/no-explicit-any */}
      />
    </div>
  );
}
