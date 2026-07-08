"use client";

import React from "react";
import { PersonalInfoCard } from "./components/PersonalInfoCard";
import { ProfessionalSummaryCard } from "./components/ProfessionalSummaryCard";
import { CoreSkillsCard } from "./components/CoreSkillsCard";
import { WorkExperienceCard } from "./components/WorkExperienceCard";
import { EducationalBackgroundCard } from "./components/EducationalBackgroundCard";
import { CertificationsCard } from "./components/CertificationsCard";
import { ResumeSidebar } from "./components/ResumeSidebar";

export function FreelancerProfilePage() {
    return (
        <div className="w-full space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                {/* Left Column: Profile Data */}
                <div className="lg:col-span-2 space-y-6">
                    <PersonalInfoCard />
                    <ProfessionalSummaryCard />
                    <CoreSkillsCard />
                    <WorkExperienceCard />
                    <EducationalBackgroundCard />
                    <CertificationsCard />
                </div>
                
                {/* Right Column: Resume Management */}
                <div className="lg:col-span-1 sticky top-8">
                    <ResumeSidebar />
                </div>
            </div>
        </div>
    );
}
