"use client";

import React, { useState, useEffect } from "react";
import { SecurityPayload } from "@/modules/client/settings/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, KeyRound, ShieldCheck, Lock, Smartphone, Monitor, Globe, LogOut } from "lucide-react";
import { toast } from "sonner";

interface SecuritySettingsProps {
  saving: boolean;
  onChangePassword: (payload: SecurityPayload) => Promise<boolean>;
}

interface DeviceSession {
  session_id: string;
  device: string;
  browser: string;
  ip_address: string;
  location: string;
  last_active: string;
  is_current: boolean;
}

export default function SecuritySettings({
  saving,
  onChangePassword,
}: SecuritySettingsProps) {
  const [form, setForm] = useState<SecurityPayload>({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [localError, setLocalError] = useState("");
  
  // Sessions states
  const [sessions, setSessions] = useState<DeviceSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const fetchSessions = React.useCallback(async () => {
    try {
      setSessionsLoading(true);
      const res = await fetch("/api/freelancer/settings/sessions");
      if (!res.ok) throw new Error("Failed to load active sessions.");
      const json = await res.json();
      setSessions(json.sessions || []);
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSessions();
  }, [fetchSessions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");

    if (!form.current_password) {
      setLocalError("Current password is required.");
      return;
    }
    if (!form.new_password || form.new_password.length < 8) {
      setLocalError("New password must be at least 8 characters long.");
      return;
    }
    if (form.new_password !== form.confirm_password) {
      setLocalError("New password and confirm password do not match.");
      return;
    }

    const ok = await onChangePassword(form);
    if (ok) {
      setForm({ current_password: "", new_password: "", confirm_password: "" });
      toast.success("Password changed successfully.");
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      setRevokingId(sessionId);
      const res = await fetch(`/api/freelancer/settings/sessions?session_id=${sessionId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to revoke session.");
      toast.success("Session terminated successfully.");
      
      if (sessionId === "current-session") {
        // Log out current session
        window.location.replace("/");
      } else {
        // Filter out from UI list
        setSessions((prev) => prev.filter((s) => s.session_id !== sessionId));
      }
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to terminate session.");
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Security Guidance Banner */}
      <div className="bg-primary/10 border border-primary/20 p-4 rounded-xl flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Account Password & Security
          </h4>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Ensure your account uses a strong, unique password with at least 8 characters. Changing your credentials requires verifying your current password.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Password Form */}
        <div className="space-y-5">
          <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Change Password</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            {localError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200/50 rounded-lg text-rose-700 dark:text-rose-300 text-xs">
                {localError}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="curr-pass" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-zinc-400" /> Current Password
              </Label>
              <Input
                id="curr-pass"
                type="password"
                value={form.current_password}
                onChange={(e) => setForm((p) => ({ ...p, current_password: e.target.value }))}
                placeholder="••••••••"
                className="h-10 text-sm rounded-lg"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-pass" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5 text-zinc-400" /> New Password
              </Label>
              <Input
                id="new-pass"
                type="password"
                value={form.new_password}
                onChange={(e) => setForm((p) => ({ ...p, new_password: e.target.value }))}
                placeholder="Min. 8 characters"
                className="h-10 text-sm rounded-lg"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="conf-pass" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5 text-zinc-400" /> Confirm New Password
              </Label>
              <Input
                id="conf-pass"
                type="password"
                value={form.confirm_password}
                onChange={(e) => setForm((p) => ({ ...p, confirm_password: e.target.value }))}
                placeholder="Re-enter new password"
                className="h-10 text-sm rounded-lg"
                required
              />
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                disabled={saving}
                className="h-10 px-6 text-sm rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground border-0 font-medium shadow-sm transition-all"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                    Updating Password...
                  </>
                ) : (
                  "Update Password"
                )}
              </Button>
            </div>
          </form>
        </div>

        {/* Active Sessions Panel */}
        <div className="space-y-5">
          <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Active Device Sessions</h3>
          {sessionsLoading ? (
            <div className="flex items-center justify-center py-10 gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
              <span className="text-xs text-zinc-400">Loading active sessions...</span>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <div 
                  key={session.session_id} 
                  className="flex items-center justify-between p-4 rounded-xl border bg-white dark:bg-zinc-950 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-zinc-50 dark:bg-zinc-900 rounded-lg text-zinc-400 mt-0.5">
                      {session.device.includes("iPhone") || session.device.includes("Android") ? (
                        <Smartphone className="h-4 w-4" />
                      ) : (
                        <Monitor className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-zinc-950 dark:text-zinc-100">{session.device}</span>
                        {session.is_current && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-200/30">This device</span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        {session.browser} • {session.ip_address}
                      </p>
                      <p className="text-[11px] text-zinc-400 flex items-center gap-1 mt-0.5">
                        <Globe className="h-3 w-3" /> {session.location} • {session.last_active}
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRevokeSession(session.session_id)}
                    disabled={revokingId === session.session_id}
                    className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg p-2"
                  >
                    {revokingId === session.session_id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <LogOut className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
