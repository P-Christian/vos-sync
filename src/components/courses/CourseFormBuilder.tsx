"use client";

import React, { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, Edit3 } from "lucide-react";

interface CourseProgram {
  title: string;
  code: string;
  defaultDegree: string;
}

interface CourseFormBuilderProps {
  courseName: string;
  courseCode: string;
  onChangeName: (val: string) => void;
  onChangeCode: (val: string) => void;
  disabled?: boolean;
}

export function CourseFormBuilder({
  courseName,
  courseCode,
  onChangeName,
  onChangeCode,
  disabled = false,
}: CourseFormBuilderProps) {
  const [mode, setMode] = useState<"builder" | "custom">("builder");
  const [degreeLevels, setDegreeLevels] = useState<string[]>([]);
  const [programs, setPrograms] = useState<CourseProgram[]>([]);
  const [majors, setMajors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Builder selections
  const [selectedDegree, setSelectedDegree] = useState<string>("");
  const [selectedProgram, setSelectedProgram] = useState<string>("");
  const [customProgram, setCustomProgram] = useState<string>("");
  const [selectedMajor, setSelectedMajor] = useState<string>("");
  const [customMajor, setCustomMajor] = useState<string>("");

  useEffect(() => {
    async function fetchCoursesCatalog() {
      try {
        setLoading(true);
        const res = await fetch("/api/public/courses");
        const data = await res.json();
        if (data.success) {
          setDegreeLevels(data.degreeLevels || []);
          setPrograms(data.programs || []);
          setMajors(data.majors || []);
          if (data.degreeLevels?.length > 0) {
            setSelectedDegree(data.degreeLevels[0]);
          }
        }
      } catch (error) {
        console.error("Failed to load courses catalog:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchCoursesCatalog();
  }, []);

  // Recalculate merged course_name and course_code when builder selections change
  useEffect(() => {
    if (mode !== "builder") return;

    const progTitle = selectedProgram === "OTHER" ? customProgram.trim() : selectedProgram;
    const majorTitle = selectedMajor === "OTHER" ? customMajor.trim() : selectedMajor;

    if (!progTitle) {
      onChangeName("");
      onChangeCode("");
      return;
    }

    const degreePrefix = selectedDegree.trim();
    let mergedName = `${degreePrefix} in ${progTitle}`;
    if (majorTitle) {
      mergedName += ` major in ${majorTitle}`;
    }

    // Auto-generate course code suggestion
    const matchedProg = programs.find((p) => p.title === selectedProgram);
    let generatedCode = matchedProg ? matchedProg.code : "";
    if (!generatedCode && progTitle) {
      generatedCode = progTitle
        .split(" ")
        .map((w) => w[0]?.toUpperCase() || "")
        .join("");
    }

    if (majorTitle) {
      const majorAbbr = majorTitle
        .split(" ")
        .map((w) => w[0]?.toUpperCase() || "")
        .join("");
      generatedCode = generatedCode ? `${generatedCode}-${majorAbbr}` : majorAbbr;
    }

    onChangeName(mergedName);
    if (generatedCode && !courseCode) {
      onChangeCode(generatedCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, selectedDegree, selectedProgram, customProgram, selectedMajor, customMajor]);

  const handleProgramSelect = (val: string) => {
    setSelectedProgram(val);
    const matched = programs.find((p) => p.title === val);
    if (matched) {
      if (matched.defaultDegree && degreeLevels.includes(matched.defaultDegree)) {
        setSelectedDegree(matched.defaultDegree);
      }
      onChangeCode(matched.code);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {mode === "builder" ? "Course Builder (API Catalog)" : "Custom Entry Mode"}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          onClick={() => {
            const nextMode = mode === "builder" ? "custom" : "builder";
            setMode(nextMode);
          }}
          className="text-xs h-7 gap-1 text-primary hover:text-primary/90"
        >
          {mode === "builder" ? (
            <>
              <Edit3 className="h-3.5 w-3.5" /> Type Custom Name
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" /> Use Course Builder
            </>
          )}
        </Button>
      </div>

      {mode === "builder" ? (
        <div className="space-y-3 p-3.5 bg-muted/30 rounded-xl border border-border/60">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Degree / Award Level</Label>
            <Select
              disabled={disabled || loading}
              value={selectedDegree}
              onValueChange={setSelectedDegree}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Select Degree Level" />
              </SelectTrigger>
              <SelectContent>
                {degreeLevels.map((lvl) => (
                  <SelectItem key={lvl} value={lvl} className="text-xs">
                    {lvl}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Program / Field of Study</Label>
            <Select
              disabled={disabled || loading}
              value={selectedProgram}
              onValueChange={handleProgramSelect}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Select Program Field..." />
              </SelectTrigger>
              <SelectContent className="max-h-56">
                {programs.map((prog) => (
                  <SelectItem key={prog.title} value={prog.title} className="text-xs">
                    {prog.title} <span className="text-muted-foreground font-mono">({prog.code})</span>
                  </SelectItem>
                ))}
                <SelectItem value="OTHER" className="text-xs italic font-semibold">
                  + Other (Type custom field)
                </SelectItem>
              </SelectContent>
            </Select>
            {selectedProgram === "OTHER" && (
              <Input
                placeholder="e.g. Information Technology & Cybersecurity"
                value={customProgram}
                onChange={(e) => setCustomProgram(e.target.value)}
                className="h-9 text-xs mt-1"
                disabled={disabled}
              />
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Major / Specialization (Optional)</Label>
            <Select
              disabled={disabled || loading}
              value={selectedMajor}
              onValueChange={setSelectedMajor}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="None / Select Major..." />
              </SelectTrigger>
              <SelectContent className="max-h-56">
                <SelectItem value="NONE" className="text-xs text-muted-foreground">
                  No Major / General Track
                </SelectItem>
                {majors.map((mj) => (
                  <SelectItem key={mj} value={mj} className="text-xs">
                    {mj}
                  </SelectItem>
                ))}
                <SelectItem value="OTHER" className="text-xs italic font-semibold">
                  + Other (Type custom major)
                </SelectItem>
              </SelectContent>
            </Select>
            {selectedMajor === "OTHER" && (
              <Input
                placeholder="e.g. Artificial Intelligence"
                value={customMajor}
                onChange={(e) => setCustomMajor(e.target.value)}
                className="h-9 text-xs mt-1"
                disabled={disabled}
              />
            )}
          </div>

          <div className="pt-2 border-t border-border/40 space-y-2">
            <div className="space-y-1">
              <Label htmlFor="courseNamePreview" className="text-[11px] font-semibold text-muted-foreground">
                Preview Full Course Name
              </Label>
              <Input
                id="courseNamePreview"
                value={courseName}
                onChange={(e) => onChangeName(e.target.value)}
                placeholder="Course name preview will appear here..."
                required
                disabled={disabled}
                className="h-9 text-xs bg-background font-medium"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="courseCodeBuilder" className="text-[11px] font-semibold text-muted-foreground">
                Course Code (Optional)
              </Label>
              <Input
                id="courseCodeBuilder"
                value={courseCode}
                onChange={(e) => onChangeCode(e.target.value)}
                placeholder="e.g. BSIT"
                disabled={disabled}
                className="h-9 text-xs font-mono uppercase bg-background"
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="courseNameCustom" className="text-xs font-medium">
              Course Name *
            </Label>
            <Input
              id="courseNameCustom"
              value={courseName}
              onChange={(e) => onChangeName(e.target.value)}
              placeholder="e.g. Bachelor of Science in Information Technology"
              required
              disabled={disabled}
              className="h-9 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="courseCodeCustom" className="text-xs font-medium">
              Course Code (Optional)
            </Label>
            <Input
              id="courseCodeCustom"
              value={courseCode}
              onChange={(e) => onChangeCode(e.target.value)}
              placeholder="e.g. BSIT"
              disabled={disabled}
              className="h-9 text-xs font-mono uppercase"
            />
          </div>
        </div>
      )}
    </div>
  );
}
