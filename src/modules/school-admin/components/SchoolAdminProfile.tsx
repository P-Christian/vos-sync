import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SchoolWithStats, VsSchool } from "../types/school-admin.types";
import { toast } from "sonner";
import { Loader2, Building2 } from "lucide-react";

export function SchoolAdminProfile({ 
  school, 
  onUpdate 
}: { 
  school: SchoolWithStats,
  onUpdate: (data: Partial<VsSchool>) => Promise<boolean>
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState<Partial<VsSchool>>({
    school_name: school.school_name || "",
    school_type: school.school_type || "University",
    school_email: school.school_email || "",
    school_contact_no: school.school_contact_no || "",
    school_website: school.school_website || "",
    school_logo_url: school.school_logo_url || "",
    school_description: school.school_description || "",
    address_line: school.address_line || "",
    barangay: school.barangay || "",
    city_municipality: school.city_municipality || "",
    province: school.province || "",
    postal_code: school.postal_code || "",
    country: school.country || "",
  });

  // Keep formData in sync if school props update
  useEffect(() => {
    if (!isEditing) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData({
        school_name: school.school_name || "",
        school_type: school.school_type || "University",
        school_email: school.school_email || "",
        school_contact_no: school.school_contact_no || "",
        school_website: school.school_website || "",
        school_logo_url: school.school_logo_url || "",
        school_description: school.school_description || "",
        address_line: school.address_line || "",
        barangay: school.barangay || "",
        city_municipality: school.city_municipality || "",
        province: school.province || "",
        postal_code: school.postal_code || "",
        country: school.country || "",
      });
    }
  }, [school, isEditing]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const uploadData = new FormData();
    uploadData.append("file", file);

    try {
      const res = await fetch("/api/school-admin/school/upload", {
        method: "POST",
        body: uploadData,
      });

      if (!res.ok) {
        throw new Error("Failed to upload image.");
      }

      const fileJson = await res.json();
      const fileId = fileJson.id; // Generated Directus file UUID

      setFormData(prev => ({ ...prev, school_logo_url: fileId }));
      toast.success("Logo uploaded successfully. Save changes to apply.");
    } catch (err) {
      console.error(err);
      toast.error("Logo upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

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

  const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
  const logoSrc = formData.school_logo_url ? `${apiBase}/assets/${formData.school_logo_url}` : null;

  return (
    <div className="p-6 space-y-6">
      {/* School Name & Logo Top Row Component */}
      <div className="flex items-center gap-4 bg-card border rounded-xl p-6 shadow-sm">
        {logoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img 
            src={logoSrc} 
            alt="School Logo" 
            className="w-16 h-16 rounded-lg object-contain border bg-white p-1"
          />
        ) : (
          <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center border">
            <Building2 className="w-8 h-8 text-muted-foreground" />
          </div>
        )}
        <div>
          <h2 className="text-2xl font-bold text-foreground">{school.school_name}</h2>
          <p className="text-sm text-muted-foreground">{school.school_type}</p>
        </div>
      </div>

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
                  onValueChange={(val: "University" | "College" | "Technical/Vocational" | "Other") => setFormData({...formData, school_type: val})}
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

              <div className="space-y-2">
                <Label htmlFor="school_logo_file">School Logo</Label>
                <div className="flex items-center gap-3">
                  <Input 
                    id="school_logo_file" 
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    disabled={!isEditing || uploading}
                    className="h-12 flex-1 file:bg-primary file:text-white file:border-0 file:rounded-md file:px-4 file:h-full file:cursor-pointer"
                  />
                  {uploading && <Loader2 className="animate-spin text-primary w-5 h-5 shrink-0" />}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="school_website">Website URL</Label>
                <Input 
                  id="school_website" 
                  value={formData.school_website || ""}
                  onChange={(e) => setFormData({...formData, school_website: e.target.value})}
                  disabled={!isEditing}
                  placeholder="https://example.com"
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
                  <Label htmlFor="barangay">Barangay</Label>
                  <Input 
                    id="barangay" 
                    value={formData.barangay || ""}
                    onChange={(e) => setFormData({...formData, barangay: e.target.value})}
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
                <div className="space-y-2">
                  <Label htmlFor="postal_code">Postal Code</Label>
                  <Input 
                    id="postal_code" 
                    value={formData.postal_code || ""}
                    onChange={(e) => setFormData({...formData, postal_code: e.target.value})}
                    disabled={!isEditing}
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
