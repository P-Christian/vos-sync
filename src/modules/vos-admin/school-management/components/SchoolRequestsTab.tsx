"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { MapSchoolModal } from "./MapSchoolModal";

interface RequestItem {
  id: number;
  employee_education_id?: number;
  course_name_raw?: string;
}

interface GroupedRequest {
  normalized_name: string;
  display_name: string;
  count: number;
  requests: RequestItem[];
}

export function SchoolRequestsTab() {
  const [requests, setRequests] = useState<GroupedRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<GroupedRequest | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/vos-admin/unverified-schools");
      const json = await res.json();
      if (res.ok) {
        setRequests(json.requests);
      } else {
        toast.error("Failed to load school requests");
      }
    } catch (e) {
      console.error(e);
      toast.error("An error occurred while loading requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApproveClick = (group: GroupedRequest) => {
    setSelectedGroup(group);
    setIsMapModalOpen(true);
  };

  const handleMapSubmit = async (officialSchoolId: number) => {
    try {
      const group = selectedGroup;
      if (!group) return;
      const educationIds = group.requests.map(r => r.employee_education_id || r.id);
      const res = await fetch("/api/vos-admin/unverified-schools", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: "bulk-map",
          education_ids: educationIds,
          official_school_id: officialSchoolId
        })
      });
      if (res.ok) {
        toast.success(`Successfully linked ${group.count} freelancers to official school!`);
        setIsMapModalOpen(false);
        fetchRequests();
      } else {
        toast.error("Failed to map schools.");
      }
    } catch (e) {
      console.error(e);
      toast.error("An error occurred during mapping.");
    }
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading requests...</div>;

  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Unverified School</TableHead>
              <TableHead>Variations</TableHead>
              <TableHead>Total Freelancers Waiting</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  No pending school requests.
                </TableCell>
              </TableRow>
            ) : (
              requests.map((group) => (
                <TableRow key={group.normalized_name}>
                  <TableCell className="font-medium">{group.display_name}</TableCell>
                  <TableCell>
                    <div className="text-xs text-muted-foreground max-w-[200px] truncate">
                      {Array.from(new Set(group.requests.map(r => r.course_name_raw || 'No Course'))).join(", ")}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-600 ring-1 ring-inset ring-blue-600/20">
                      {group.count} user{group.count > 1 ? 's' : ''}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" onClick={() => handleApproveClick(group)}>
                        Map to Official School
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <MapSchoolModal
        open={isMapModalOpen}
        onOpenChange={setIsMapModalOpen}
        group={selectedGroup!}
        onSubmit={handleMapSubmit}
      />
    </div>
  );
}
