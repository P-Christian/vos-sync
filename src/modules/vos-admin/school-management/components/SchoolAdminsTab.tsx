"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { VsSchoolAdminRecord, CreateSchoolAdminPayload } from "../types/school.types";
import { SendInviteModal } from "./SendInviteModal";

interface SchoolAdminsTabProps {
  schoolId: number;
  schoolName: string;
  schoolEmail: string | null;
  admins: VsSchoolAdminRecord[];
  onAddAdmin: (payload: CreateSchoolAdminPayload) => Promise<boolean>;
  onRemoveAdmin: (adminId: number) => Promise<boolean>;
}

export function SchoolAdminsTab({ schoolId, schoolName, schoolEmail, admins, onAddAdmin, onRemoveAdmin }: SchoolAdminsTabProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">School Administrators</h2>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Send Invite Link
        </Button>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Assigned Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {admins.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                  No administrators assigned yet.
                </TableCell>
              </TableRow>
            ) : (
              admins.map((admin) => (
                <TableRow key={admin.school_admin_id}>
                  <TableCell className="font-medium">
                    {admin.user_fname} {admin.user_lname}
                  </TableCell>
                  <TableCell>{admin.user_email}</TableCell>
                  <TableCell>{new Date(admin.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={async () => {
                        const success = await onRemoveAdmin(admin.school_admin_id);
                        if (success) {
                            toast.success("Administrator access removed.");
                        } else {
                            toast.error("Failed to remove administrator.");
                        }
                      }}
                    >
                      Remove Access
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <SendInviteModal
        schoolId={schoolId}
        schoolName={schoolName}
        schoolEmail={schoolEmail}
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
      />
    </div>
  );
}
