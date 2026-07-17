// src/modules/vos-admin/school-management/components/SchoolProfilePage.tsx
"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Building2, MapPin, Mail, Phone, Globe } from "lucide-react";
import { useSchoolDetail } from "../hooks/useSchoolDetail";
import { SchoolStatusBadge } from "./SchoolStatusBadge";
import { SchoolCoursesTab } from "./SchoolCoursesTab";
import { SchoolAdminsTab } from "./SchoolAdminsTab";
import { SchoolTableSkeleton } from "./SchoolTableSkeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";

export function SchoolProfilePage({ schoolId }: { schoolId: number }) {
  const { school, courses, admins, loading, fetchSchoolDetail, fetchAdmins, addCourse, updateCourseStatus, createAdmin, removeAdmin } = useSchoolDetail();

  useEffect(() => {
    fetchSchoolDetail(schoolId);
    fetchAdmins(schoolId);
  }, [fetchSchoolDetail, fetchAdmins, schoolId]);

  if (loading && !school) {
    return <div className="p-6"><SchoolTableSkeleton /></div>;
  }

  if (!school && !loading) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-64 space-y-4">
        <p className="text-muted-foreground">School not found.</p>
        <Button asChild variant="outline">
          <Link href="/vos-sync/vos-admin/schools">Back to List</Link>
        </Button>
      </div>
    );
  }

  if (!school) return null;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href="/vos-sync/vos-admin/schools">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex h-16 w-16 items-center justify-center rounded-lg border bg-muted">
          {school.school_logo_url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={school.school_logo_url} alt={school.school_name} className="h-full w-full object-cover rounded-lg" />
          ) : (
            <Building2 className="h-8 w-8 text-muted-foreground" />
          )}
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{school.school_name}</h1>
          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
            <SchoolStatusBadge status={school.school_status} />
            <span>•</span>
            <span>{school.school_type}</span>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="courses">Courses ({courses.length})</TabsTrigger>
          <TabsTrigger value="admins">Administrators ({admins?.length || 0})</TabsTrigger>
          <TabsTrigger value="students" disabled>Students</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-2">
              <CardContent className="p-6 space-y-4">
                <h3 className="font-semibold text-lg">About</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {school.school_description || "No description provided."}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 space-y-4">
                <h3 className="font-semibold text-lg">Contact Info</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <span>
                      {school.address_line ? `${school.address_line}, ` : ""}
                      {school.city_municipality}, {school.province}
                    </span>
                  </div>
                  {school.school_email && (
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a href={`mailto:${school.school_email}`} className="hover:underline">{school.school_email}</a>
                    </div>
                  )}
                  {school.school_contact_no && (
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{school.school_contact_no}</span>
                    </div>
                  )}
                  {school.school_website && (
                    <div className="flex items-center gap-3">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <a href={school.school_website} target="_blank" rel="noreferrer" className="hover:underline text-blue-600">
                        Website
                      </a>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="courses" className="mt-6">
          <SchoolCoursesTab 
            schoolId={schoolId} 
            courses={courses} 
            onAddCourse={(data) => addCourse(schoolId, data)} 
            onToggleStatus={(courseId, status) => updateCourseStatus(schoolId, courseId, status)} 
          />
        </TabsContent>

        <TabsContent value="admins" className="mt-6">
          <SchoolAdminsTab 
            schoolId={schoolId} 
            admins={admins} 
            onAddAdmin={(data) => createAdmin(data)} 
            onRemoveAdmin={(adminId) => removeAdmin(schoolId, adminId)} 
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
