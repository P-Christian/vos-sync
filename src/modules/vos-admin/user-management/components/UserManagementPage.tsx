// src/modules/vos-admin/user-management/components/UserManagementPage.tsx
"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useUsers } from "../hooks/useUsers";
import { VsUser } from "../types/user.types";
import { DataTable } from "../../request-management/components/new-data-table";
import { UserStatusBadge } from "./UserStatusBadge";
import { UserDetailModal } from "./UserDetailModal";
import { ColumnDef } from "@tanstack/react-table";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye } from "lucide-react";

export function UserManagementPage() {
  const { users, total, loading, fetchUsers, reviewIdentity } = useUsers();
  
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  
  const [selectedUser, setSelectedUser] = useState<VsUser | null>(null);
  const [detailOpen, setDetailOpen] = useState<boolean>(false);

  const loadData = useCallback(() => {
    const roleId = roleFilter === "ALL" ? undefined : Number(roleFilter);
    fetchUsers(roleId, searchQuery, page, limit);
  }, [fetchUsers, roleFilter, searchQuery, page, limit]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleViewDetails = (user: VsUser) => {
    setSelectedUser(user);
    setDetailOpen(true);
  };

  const handleReviewDocument = async (verificationId: number, status: 'approved' | 'rejected', rejectionNote?: string) => {
    const success = await reviewIdentity(verificationId, status, rejectionNote);
    if (success) {
      loadData();
    }
    return success;
  };

  const getRoleLabel = (roleId: number | null) => {
    switch (roleId) {
      case 1: return "Freelancer";
      case 2: return "Client";
      case 3: return "Admin";
      case 4: return "School Admin";
      default: return "Unknown";
    }
  };

  const getVerificationStatus = (user: VsUser): 'pending' | 'approved' | 'rejected' | 'not_submitted' => {
    const verifs = user.verifications || [];
    if (verifs.length === 0) return 'not_submitted';
    
    // According to the new logic where there is max 1 record per type:
    if (verifs.some(v => v.status === 'pending')) return 'pending';
    if (verifs.some(v => v.status === 'rejected')) return 'rejected';
    
    // Check if all 3 required types are present and approved
    const typesPresent = new Set(verifs.map(v => v.type));
    if (typesPresent.has('gov_id') && typesPresent.has('address') && typesPresent.has('mobile_number') && verifs.every(v => v.status === 'approved')) {
      return 'approved';
    }
    
    return 'not_submitted'; // Still waiting for other documents
  };

  const columns = useMemo<ColumnDef<VsUser>[]>(() => [
    {
      id: "name",
      header: "Full Name",
      cell: ({ row }) => {
        const u = row.original;
        return `${u.user_fname} ${u.user_lname}`;
      }
    },
    {
      accessorKey: "user_email",
      header: "Email Address",
    },
    {
      id: "role",
      header: "Role",
      cell: ({ row }) => {
        const u = row.original;
        return (
          <span className="font-semibold text-zinc-700 dark:text-zinc-300">
            {getRoleLabel(u.role_id)}
          </span>
        );
      }
    },
    {
      id: "verification",
      header: "Verification",
      cell: ({ row }) => {
        const u = row.original;
        const status = getVerificationStatus(u);
        return <UserStatusBadge status={status} />;
      }
    },
    {
      id: "actions",
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const u = row.original;
        return (
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleViewDetails(u)}
              className="flex items-center gap-1 text-primary border-primary/20 hover:bg-primary/5"
            >
              <Eye className="h-4 w-4" /> View Info
            </Button>
          </div>
        );
      }
    }
  ], []);

  // Map roles to dropdown options
  const roleDropdownOptions = [
    { value: "ALL", label: "All Roles" },
    { value: "1", label: "Freelancer" },
    { value: "2", label: "Client / Employer" },
    { value: "3", label: "Admin" },
    { value: "4", label: "School Admin" },
  ];

  return (
    <div className="h-full flex-1 overflow-y-auto p-4 sm:p-8 bg-secondary/10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
        <p className="text-muted-foreground mt-1">Review user accounts, view complete information, and approve/reject identity documents.</p>
      </div>

      <Card className="p-6 bg-white dark:bg-zinc-900 border dark:border-zinc-800 shadow-sm rounded-xl">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
          <h2 className="text-xl font-semibold">User Accounts</h2>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Select value={roleFilter} onValueChange={(val) => { setRoleFilter(val); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-[200px] bg-white dark:bg-zinc-900 dark:border-zinc-800">
                <SelectValue placeholder="Filter by Role" />
              </SelectTrigger>
              <SelectContent>
                {roleDropdownOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={users}
          onSearch={(val) => { setSearchQuery(val); setPage(1); }}
          isLoading={loading}
          manualPagination={true}
          pageCount={Math.ceil(total / limit)}
          pagination={{
            pageIndex: page - 1,
            pageSize: limit,
          }}
          onPaginationChange={(newPagination) => {
            setPage(newPagination.pageIndex + 1);
            setLimit(newPagination.pageSize);
          }}
        />
      </Card>

      <UserDetailModal
        user={selectedUser}
        isOpen={detailOpen}
        onClose={() => { setDetailOpen(false); setSelectedUser(null); }}
        onReview={handleReviewDocument}
      />
    </div>
  );
}
