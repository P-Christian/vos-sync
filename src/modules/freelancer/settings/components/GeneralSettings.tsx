"use client";

import React, { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useThemeSettings } from "@/components/theme/useThemeSettings";
import { ACCENTS, DEFAULT_THEME_SETTINGS, clamp } from "@/components/theme/theme-settings";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Check, Monitor, Moon, Sun, Loader2, Save, RefreshCw, Palette, Globe, Accessibility } from "lucide-react";
import { toast } from "sonner";

function AccentSwatch({ hsl }: { hsl: string }) {
  return (
    <span
      className="inline-flex h-4 w-4 rounded-full border"
      style={{ backgroundColor: `hsl(${hsl})` }}
      aria-hidden="true"
    />
  );
}

const TIMEZONES = [
  { value: "Asia/Manila", label: "Manila (UTC+8)" },
  { value: "Asia/Singapore", label: "Singapore (UTC+8)" },
  { value: "Asia/Tokyo", label: "Tokyo (UTC+9)" },
  { value: "America/New_York", label: "Eastern Time (UTC-5/UTC-4)" },
  { value: "America/Los_Angeles", label: "Pacific Time (UTC-8/UTC-7)" },
  { value: "UTC", label: "UTC" },
];

const LANGUAGES = [
  { value: "en-US", label: "English (US)" },
  { value: "fil-PH", label: "Filipino (Philippines)" },
  { value: "ja-JP", label: "日本語 (Japanese)" },
];

const DATE_FORMATS = [
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD (e.g. 2026-07-25)" },
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY (e.g. 07/25/2026)" },
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY (e.g. 25/07/2026)" },
];

export default function GeneralSettings() {
  const { theme, setTheme } = useTheme();
  const { settings: themeSettings, updateSettings: updateThemeSettings, resetSettings: resetThemeSettings } = useThemeSettings();

  // Settings state
  const [locale, setLocale] = useState("en-US");
  const [timezone, setTimezone] = useState("Asia/Manila");
  const [dateFormat, setDateFormat] = useState("YYYY-MM-DD");
  const [textSize, setTextSize] = useState<"small" | "medium" | "large">("medium");
  const [reducedMotion, setReducedMotion] = useState(false);
  const [version, setVersion] = useState(1);

  const applyTextSize = React.useCallback((size: "small" | "medium" | "large") => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.classList.remove("text-sm", "text-base", "text-lg");
    if (size === "small") root.classList.add("text-sm");
    else if (size === "medium") root.classList.add("text-base");
    else if (size === "large") root.classList.add("text-lg");
  }, []);

  // Status
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load preferences from DB
  const loadPreferences = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/freelancer/settings/general");
      if (!res.ok) throw new Error("Failed to load settings from server.");
      const data = await res.json();
      
      setLocale(data.locale);
      setTimezone(data.timezone);
      setDateFormat(data.date_time_format);
      setTextSize(data.text_size);
      setReducedMotion(data.reduced_motion === 1);
      setVersion(data.settings_version);

      // Apply text size to root
      applyTextSize(data.text_size);
    } catch (err: unknown) {
      console.error(err);
      toast.error((err as Error).message || "Failed to load preferences.");
    } finally {
      setLoading(false);
    }
  }, [applyTextSize]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPreferences();
  }, [loadPreferences]);


  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = {
        locale,
        timezone,
        date_time_format: dateFormat,
        text_size: textSize,
        reduced_motion: reducedMotion,
        settings_version: version,
      };

      const res = await fetch("/api/freelancer/settings/general", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.status === 409) {
        toast.error("Version conflict: settings updated elsewhere. Reloading...");
        loadPreferences();
        return;
      }

      if (!res.ok) throw new Error("Failed to save settings.");
      const json = await res.json();

      setVersion(json.settings.settings_version);
      applyTextSize(textSize);
      toast.success("General preferences saved successfully.");
    } catch (err: unknown) {
      console.error(err);
      toast.error((err as Error).message || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const previewTripletByAccent = React.useMemo(() => {
    return new Map(ACCENTS.map((a) => [a.key, `${a.hue} ${a.sat}% 48%`]));
  }, []);

  const radiusPx = Math.round(themeSettings.radiusRem * 16);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
        <span className="text-sm text-zinc-400">Loading settings & preferences...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. General Preferences Section */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <div className="p-2 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-500 rounded-xl">
            <Globe className="h-5 w-5" />
          </div>
          <div>
            <CardTitle>General & Regional Preferences</CardTitle>
            <CardDescription>Configure language options, date format preferences, and IANA timezone parameters.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="space-y-2">
              <Label htmlFor="lang-select">Language / Locale</Label>
              <Select value={locale} onValueChange={setLocale}>
                <SelectTrigger id="lang-select">
                  <SelectValue placeholder="Select Language" />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tz-select">Timezone</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger id="tz-select">
                  <SelectValue placeholder="Select Timezone" />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date-format-select">Date/Time Format</Label>
              <Select value={dateFormat} onValueChange={setDateFormat}>
                <SelectTrigger id="date-format-select">
                  <SelectValue placeholder="Select Date Format" />
                </SelectTrigger>
                <SelectContent>
                  {DATE_FORMATS.map((df) => (
                    <SelectItem key={df.value} value={df.value}>
                      {df.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Accessibility Section */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <div className="p-2 bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-500 rounded-xl">
            <Accessibility className="h-5 w-5" />
          </div>
          <div>
            <CardTitle>Accessibility Settings</CardTitle>
            <CardDescription>Tailor display text sizing and transition effects to enhance visibility and usability.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label>Text Sizing Scale</Label>
              <ToggleGroup
                type="single"
                value={textSize}
                onValueChange={(val) => {
                  if (val) setTextSize(val as "small" | "medium" | "large");
                }}
                className="justify-start"
              >
                <ToggleGroupItem value="small">Small</ToggleGroupItem>
                <ToggleGroupItem value="medium">Medium (Default)</ToggleGroupItem>
                <ToggleGroupItem value="large">Large</ToggleGroupItem>
              </ToggleGroup>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl border bg-zinc-50/50 dark:bg-zinc-900/10">
              <div className="space-y-0.5">
                <Label htmlFor="reduced-motion-switch" className="text-sm font-semibold">Reduced Motion</Label>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Minimize animations and slide transitions.</p>
              </div>
              <Switch
                id="reduced-motion-switch"
                checked={reducedMotion}
                onCheckedChange={setReducedMotion}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Appearance Section (VOS Style Settings) */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <div className="p-2 bg-pink-500/10 dark:bg-pink-500/20 text-pink-500 rounded-xl">
            <Palette className="h-5 w-5" />
          </div>
          <div>
            <CardTitle>Appearance & Themes</CardTitle>
            <CardDescription>Select visual styling options, accent primary highlights, and border corner radiuses.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="grid gap-2">
            <Label>Theme mode</Label>
            <ToggleGroup
              type="single"
              value={theme ?? "system"}
              onValueChange={(v) => {
                if (v) setTheme(v);
              }}
              className="justify-start"
            >
              <ToggleGroupItem value="light" className="gap-2">
                <Sun className="h-4 w-4" /> Light
              </ToggleGroupItem>
              <ToggleGroupItem value="dark" className="gap-2">
                <Moon className="h-4 w-4" /> Dark
              </ToggleGroupItem>
              <ToggleGroupItem value="system" className="gap-2">
                <Monitor className="h-4 w-4" /> System
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <Separator />

          {/* Accent Selection */}
          <div className="grid gap-3">
            <Label>Accent Color (Primary Highlights)</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {ACCENTS.map((a) => {
                const triplet = previewTripletByAccent.get(a.key) ?? "224 76% 48%";
                const active = themeSettings.accent === a.key;

                return (
                  <button
                    key={a.key}
                    type="button"
                    onClick={() => updateThemeSettings({ accent: a.key })}
                    className={cn(
                      "flex items-center justify-between rounded-lg border bg-card px-3 py-2 text-left text-sm transition",
                      "hover:bg-accent/60",
                      active && "ring-2 ring-ring"
                    )}
                  >
                    <span className="inline-flex items-center gap-2">
                      <AccentSwatch hsl={triplet} />
                      {a.name}
                    </span>
                    {active ? <Check className="h-4 w-4 text-primary" /> : null}
                  </button>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Radius Slider */}
          <div className="grid gap-3">
            <div className="flex items-center justify-between gap-4">
              <Label>Border Corner Radius</Label>
              <span className="text-xs text-muted-foreground">{radiusPx}px</span>
            </div>
            <Slider
              value={[themeSettings.radiusRem]}
              min={0.4}
              max={1.25}
              step={0.05}
              onValueChange={(v) => {
                const next = clamp(v?.[0] ?? DEFAULT_THEME_SETTINGS.radiusRem, 0.4, 1.25);
                updateThemeSettings({ radiusRem: next });
              }}
            />
          </div>

          <Separator />

          {/* Density selection */}
          <div className="grid gap-2">
            <Label>UI Density</Label>
            <ToggleGroup
              type="single"
              value={themeSettings.density}
              onValueChange={(v) => {
                if (v) updateThemeSettings({ density: v as "comfortable" | "compact" });
              }}
              className="justify-start"
            >
              <ToggleGroupItem value="comfortable">Comfortable</ToggleGroupItem>
              <ToggleGroupItem value="compact">Compact</ToggleGroupItem>
            </ToggleGroup>
          </div>
        </CardContent>
      </Card>

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button
          variant="outline"
          onClick={() => {
            resetThemeSettings();
            setLocale("en-US");
            setTimezone("Asia/Manila");
            setDateFormat("YYYY-MM-DD");
            setTextSize("medium");
            setReducedMotion(false);
          }}
          disabled={saving}
          className="rounded-xl"
        >
          <RefreshCw className="h-4 w-4 mr-2" /> Reset all defaults
        </Button>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="rounded-xl px-6 bg-primary hover:bg-primary/95 text-primary-foreground font-semibold shadow-sm"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving settings...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" /> Save Preferences
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
