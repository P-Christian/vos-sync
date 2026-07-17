import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SchoolWithStats, VsSchool } from "../types/school-admin.types";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export function SchoolAdminProfile({ 
  school, 
  onUpdate 
}: { 
  school: SchoolWithStats,
  onUpdate: (data: Partial<VsSchool>) => Promise<boolean>
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<VsSchool>>({
    school_name: school.school_name || "",
    school_type: school.school_type || "University",
    school_email: school.school_email || "",
    school_contact_no: school.school_contact_no || "",
    school_website: school.school_website || "",
    school_description: school.school_description || "",
    address_line: school.address_line || "",
    city_municipality: school.city_municipality || "",
    province: school.province || "",
    postal_code: school.postal_code || "",
    country: school.country || "",
  });

  // Keep formData in sync if school props update
  useEffect(() => {
    if (!isEditing) {
      setFormData({
        school_name: school.school_name || "",
        school_type: school.school_type || "University",
        school_email: school.school_email || "",
        school_contact_no: school.school_contact_no || "",
        school_website: school.school_website || "",
        school_description: school.school_description || "",
        address_line: school.address_line || "",
        city_municipality: school.city_municipality || "",
        province: school.province || "",
        postal_code: school.postal_code || "",
        country: school.country || "",
      });
    }
  }, [school, isEditing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const success = await onUpdate(formData);
    setSaving(false);
    if (success) {
      toast.success("School profile updated successfully.");
      setIsEditing(false);
    } else {
      toast.error("Failed to update school profile.");
    }
  };

  return (
    <div className="p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>School Profile</CardTitle>
            <CardDescription>View and manage your school details</CardDescription>
          </div>
          {!isEditing && (
            <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="school_name">School Name</Label>
                <Input 
                  id="school_name" 
                  value={formData.school_name || ""}
                  onChange={(e) => setFormData({...formData, school_name: e.target.value})}
                  disabled={!isEditing}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="school_type">School Type</Label>
                <Select 
                  disabled={!isEditing} 
                  value={formData.school_type} 
                  onValueChange={(val: any) => setFormData({...formData, school_type: val})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="University">University</SelectItem>
                    <SelectItem value="College">College</SelectItem>
                    <SelectItem value="Technical/Vocational">Technical/Vocational</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="school_email">Email</Label>
                <Input 
                  id="school_email" 
                  type="email"
                  value={formData.school_email || ""}
                  onChange={(e) => setFormData({...formData, school_email: e.target.value})}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="school_contact_no">Contact Number</Label>
                <Input 
                  id="school_contact_no" 
                  value={formData.school_contact_no || ""}
                  onChange={(e) => setFormData({...formData, school_contact_no: e.target.value})}
                  disabled={!isEditing}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="school_description">Description</Label>
                <Textarea 
                  id="school_description" 
                  value={formData.school_description || ""}
                  onChange={(e) => setFormData({...formData, school_description: e.target.value})}
                  disabled={!isEditing}
                  rows={4}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Address Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address_line">Address Line</Label>
                  <Input 
                    id="address_line" 
                    value={formData.address_line || ""}
                    onChange={(e) => setFormData({...formData, address_line: e.target.value})}
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city_municipality">City/Municipality</Label>
                  <Input 
                    id="city_municipality" 
                    value={formData.city_municipality || ""}
                    onChange={(e) => setFormData({...formData, city_municipality: e.target.value})}
                    disabled={!isEditing}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="province">Province</Label>
                  <Input 
                    id="province" 
                    value={formData.province || ""}
                    onChange={(e) => setFormData({...formData, province: e.target.value})}
                    disabled={!isEditing}
                    required
                  />
                </div>
              </div>
            </div>

            {isEditing && (
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsEditing(false)} disabled={saving}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
