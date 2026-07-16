// src/modules/vos-admin/request-management/components/RequestManagementPage.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRequests } from "../hooks/useRequests";
import { SchoolRequestsTab } from "./SchoolRequestsTab";
import { CourseRequestsTab } from "./CourseRequestsTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function RequestManagementPage() {
  const { 
    schoolRequests, 
    courseRequests,
    fetchSchoolRequests, 
    fetchCourseRequests,
    createSchoolRequest,
    createCourseRequest,
    reviewSchoolRequest,
    reviewCourseRequest
  } = useRequests();

  const [schoolStatusFilter, setSchoolStatusFilter] = useState("Pending");
  const [courseStatusFilter, setCourseStatusFilter] = useState("Pending");

  useEffect(() => {
    fetchSchoolRequests(schoolStatusFilter);
  }, [fetchSchoolRequests, schoolStatusFilter]);

  useEffect(() => {
    fetchCourseRequests(courseStatusFilter);
  }, [fetchCourseRequests, courseStatusFilter]);

  return (
    <div className="h-full flex-1 overflow-y-auto p-4 sm:p-8 bg-secondary/10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Request Management</h1>
        <p className="text-muted-foreground mt-1">Review and manage missing school and course requests.</p>
      </div>

      <Tabs defaultValue="schools" className="w-full">
        <TabsList className="bg-white/50 border shadow-sm">
          <TabsTrigger value="schools">School Requests</TabsTrigger>
          <TabsTrigger value="courses">Course Requests</TabsTrigger>
        </TabsList>
        
        <TabsContent value="schools" className="mt-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Missing Schools</h2>
            <Select value={schoolStatusFilter} onValueChange={setSchoolStatusFilter}>
              <SelectTrigger className="w-[180px] bg-white">
                <SelectValue placeholder="Filter Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Pending">Pending Only</SelectItem>
                <SelectItem value="Approved">Approved Only</SelectItem>
                <SelectItem value="Rejected">Rejected Only</SelectItem>
                <SelectItem value="ALL">All Statuses</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <SchoolRequestsTab 
            requests={schoolRequests} 
            onCreate={async (data) => {
              const res = await createSchoolRequest(data);
              if (res) fetchSchoolRequests(schoolStatusFilter);
              return res;
            }}
            onReview={reviewSchoolRequest} 
          />
        </TabsContent>

        <TabsContent value="courses" className="mt-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Missing Courses</h2>
            <Select value={courseStatusFilter} onValueChange={setCourseStatusFilter}>
              <SelectTrigger className="w-[180px] bg-white">
                <SelectValue placeholder="Filter Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Pending">Pending Only</SelectItem>
                <SelectItem value="Approved">Approved Only</SelectItem>
                <SelectItem value="Rejected">Rejected Only</SelectItem>
                <SelectItem value="ALL">All Statuses</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <CourseRequestsTab 
            requests={courseRequests} 
            onCreate={async (data) => {
              const res = await createCourseRequest(data);
              if (res) fetchCourseRequests(courseStatusFilter);
              return res;
            }}
            onReview={reviewCourseRequest} 
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
