"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreateSchoolAdminPayload } from "../types/school.types";

interface CreateSchoolAdminModalProps {
  schoolId: number; // Pre-selected for this view
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: CreateSchoolAdminPayload) => Promise<void>;
}

export function CreateSchoolAdminModal({ schoolId, isOpen, onClose, onSave }: CreateSchoolAdminModalProps) {
  const [saving, setSaving] = useState(false);
  const [schools, setSchools] = useState<{ school_id: number; school_name: string }[]>([]);
  const [formData, setFormData] = useState({
    school_id: schoolId,
    user_fname: "",
    user_lname: "",
    user_email: "",
    user_contact: "",
    password: "",
  });

  // Keep formData school_id in sync if schoolId prop changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFormData(prev => ({ ...prev, school_id: schoolId }));
  }, [schoolId]);

  useEffect(() => {
    if (isOpen) {
      // Fetch schools for the dropdown
      fetch('/api/vos-admin/schools?limit=-1') // assuming a list route exists, or we created the repo function getAllSchoolsForDropdown
        .then(res => res.json())
        .then(data => {
            if (data.schools) setSchools(data.schools);
        })
        .catch(console.error);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave({
      school_id: formData.school_id,
      user_fname: formData.user_fname,
      user_lname: formData.user_lname,
      user_email: formData.user_email,
      user_contact: formData.user_contact,
      password: formData.password || undefined,
    });
    setSaving(false);
    setFormData({ school_id: schoolId, user_fname: "", user_lname: "", user_email: "", user_contact: "", password: "" }); // Reset
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Assign School Admin</DialogTitle>
            <DialogDescription>
              Create a new user account and assign them as a School Administrator.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="school_id">Assign to School</Label>
              <Select 
                value={String(formData.school_id)} 
                onValueChange={(val) => setFormData({ ...formData, school_id: Number(val) })}
              >
                <SelectTrigger id="school_id">
                  <SelectValue placeholder="Select a school" />
                </SelectTrigger>
                <SelectContent>
                  {schools.map(s => (
                    <SelectItem key={s.school_id} value={String(s.school_id)}>
                      {s.school_name}
                    </SelectItem>
                  ))}
                  {schools.length === 0 && (
                    <SelectItem value={String(schoolId)}>Current School</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="user_fname">First Name</Label>
                <Input
                  id="user_fname"
                  required
                  value={formData.user_fname}
                  onChange={(e) => setFormData({ ...formData, user_fname: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="user_lname">Last Name</Label>
                <Input
                  id="user_lname"
                  required
                  value={formData.user_lname}
                  onChange={(e) => setFormData({ ...formData, user_lname: e.target.value })}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="user_email">Email Address</Label>
                <Input
                  id="user_email"
                  type="email"
                  required
                  value={formData.user_email}
                  onChange={(e) => setFormData({ ...formData, user_email: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="user_contact">Contact Number</Label>
                <Input
                  id="user_contact"
                  required
                  placeholder="e.g. +639123456789"
                  value={formData.user_contact}
                  onChange={(e) => setFormData({ ...formData, user_contact: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Leave blank for 'password123'"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">The user can change this later.</p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create & Assign
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
