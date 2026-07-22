"use client";

// src/modules/client/settings/components/TeamSettings.tsx

import React, { useEffect } from "react";
import { TeamMember } from "../types";
import { Button } from "@/components/ui/button";
import { Users, Shield, Loader2, UserCheck, UserX } from "lucide-react";

interface TeamSettingsProps {
  team: TeamMember[];
  loading: boolean;
  saving: boolean;
  onLoadTeam: () => void;
  onModifyRole: (
    companyUserId: number,
    role: "OWNER" | "ADMIN" | "MEMBER",
    status?: "ACTIVE" | "INACTIVE"
  ) => Promise<boolean>;
}

export default function TeamSettings({
  team,
  loading,
  saving,
  onLoadTeam,
  onModifyRole,
}: TeamSettingsProps) {
  useEffect(() => {
    onLoadTeam();
  }, [onLoadTeam]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
        <span className="text-sm text-zinc-400">Loading team members...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            Company Members & Roles
          </h4>
          <p className="text-xs text-zinc-400 mt-0.5">
            Manage your company workspace access and assigned permission levels.
          </p>
        </div>
      </div>

      {team.length === 0 ? (
        <div className="py-12 text-center text-sm text-zinc-400 bg-zinc-50 dark:bg-zinc-900/40 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <Users className="h-8 w-8 text-zinc-300 mx-auto mb-2" />
          No additional team members assigned to this company workspace.
        </div>
      ) : (
        <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800">
          {team.map((member) => (
            <div
              key={member.company_user_id}
              className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs uppercase">
                  {member.user_fname?.[0] || "U"}
                  {member.user_lname?.[0] || ""}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {member.user_fname} {member.user_lname}
                    </p>
                    {member.is_primary_contact && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded-full font-medium">
                        Primary Contact
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400">{member.user_email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  <Shield className="h-3.5 w-3.5 text-zinc-400" />
                  {member.company_user_role}
                </div>

                {member.company_user_role !== "OWNER" && (
                  <div className="flex items-center gap-1">
                    {member.company_user_role === "MEMBER" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={saving}
                        onClick={() => onModifyRole(member.company_user_id, "ADMIN")}
                        className="h-8 text-xs rounded-lg"
                      >
                        Promote to Admin
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={saving}
                        onClick={() => onModifyRole(member.company_user_id, "MEMBER")}
                        className="h-8 text-xs rounded-lg"
                      >
                        Demote to Member
                      </Button>
                    )}

                    {member.status === "ACTIVE" ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={saving}
                        onClick={() =>
                          onModifyRole(member.company_user_id, member.company_user_role, "INACTIVE")
                        }
                        className="h-8 w-8 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg"
                        title="Deactivate Member"
                      >
                        <UserX className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={saving}
                        onClick={() =>
                          onModifyRole(member.company_user_id, member.company_user_role, "ACTIVE")
                        }
                        className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg"
                        title="Activate Member"
                      >
                        <UserCheck className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
