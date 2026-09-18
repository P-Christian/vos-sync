"use client";

import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { ChevronDown, Search } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  COUNTRIES,
  formatPhoneNumber,
  type CountryData,
} from "./country-data";

/**
 * Same country-aware phone input used by the signup flows, kept visually
 * identical so the student form matches the public registration language.
 * Country data and formatting come from the signup page module to avoid
 * drifting copies.
 */
export function PhoneCountryPicker({
  selectedCountry,
  onSelectCountry,
  phoneValue,
  onPhoneChange,
  error,
  disabled,
  inputId,
}: {
  selectedCountry: CountryData;
  onSelectCountry: (country: CountryData) => void;
  phoneValue: string;
  onPhoneChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  inputId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const listboxId = `${inputId ?? "student-phone"}-country-listbox`;

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = COUNTRIES.filter(
    (country) =>
      country.name.toLowerCase().includes(search.toLowerCase()) ||
      country.dialCode.includes(search) ||
      country.code.toLowerCase().includes(search.toLowerCase())
  );

  const closeDropdown = () => {
    setOpen(false);
    setSearch("");
    triggerRef.current?.focus();
  };

  const handleListboxKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeDropdown();
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const options = Array.from(listboxRef.current?.querySelectorAll<HTMLButtonElement>("[role='option']") ?? []);
    if (options.length === 0) return;
    const activeIndex = options.findIndex((option) => option === document.activeElement);
    const nextIndex = event.key === "ArrowDown"
      ? (activeIndex + 1) % options.length
      : (activeIndex <= 0 ? options.length : activeIndex) - 1;
    options[nextIndex]?.focus();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        className={cn(
          "flex h-12 border-2 border-border rounded-lg overflow-hidden transition-colors focus-within:border-primary",
          error && "border-destructive focus-within:border-destructive"
        )}
      >
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          onClick={() => setOpen(!open)}
          aria-label="Select country dialing code"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-haspopup="listbox"
          className="flex items-center gap-1.5 px-3 bg-muted/40 hover:bg-muted border-r border-border transition-colors cursor-pointer shrink-0"
        >
          <span className="text-xs font-semibold select-none leading-none">{selectedCountry.flag}</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>
        <div className="flex items-center flex-1 px-3 bg-background">
          <span className="text-sm font-semibold text-muted-foreground mr-2 shrink-0 select-none">
            {selectedCountry.dialCode}
          </span>
          <input
            id={inputId}
            type="tel"
            disabled={disabled}
            value={phoneValue}
            onChange={(event) => onPhoneChange(formatPhoneNumber(event.target.value))}
            placeholder="Enter number"
            aria-label="Mobile number"
            aria-invalid={Boolean(error)}
            aria-describedby={error && inputId ? `${inputId}-error` : undefined}
            className="w-full h-full bg-transparent border-0 outline-none text-foreground text-sm font-medium placeholder:text-muted-foreground/60"
          />
        </div>
      </div>
      {open && (
        <div
          id={listboxId}
          ref={listboxRef}
          role="listbox"
          aria-label="Country dialing codes"
          onKeyDown={handleListboxKeyDown}
          className="absolute left-0 top-full mt-2 w-72 bg-popover text-popover-foreground border-2 border-border rounded-xl shadow-xl z-50 overflow-hidden"
        >
          <div className="p-3 border-b border-border bg-muted/20 flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  listboxRef.current?.querySelector<HTMLButtonElement>("[role='option']")?.focus();
                }
              }}
              placeholder="Search for country..."
              aria-label="Search countries"
              className="w-full bg-transparent text-xs outline-none text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <div className="max-h-60 overflow-y-auto p-1 divide-y divide-border/20">
            {filtered.length === 0 ? (
              <div className="p-4 text-xs text-center text-muted-foreground">No country found</div>
            ) : (
              filtered.map((country) => (
                <button
                  key={`${country.code}-${country.dialCode}`}
                  type="button"
                  role="option"
                  aria-selected={selectedCountry.name === country.name}
                  onClick={() => {
                    onSelectCountry(country);
                    closeDropdown();
                  }}
                  className={cn(
                    "w-full min-h-11 flex items-center justify-between px-3 py-3 text-sm rounded-lg text-left transition-colors cursor-pointer hover:bg-muted/80",
                    selectedCountry.name === country.name && "bg-primary/10 text-primary font-semibold"
                  )}
                >
                  <span className="flex items-center gap-2 truncate">
                    <span className="text-xs font-semibold select-none">{country.flag}</span>
                    <span className="truncate">{country.name}</span>
                  </span>
                  <span className="text-xs text-muted-foreground font-mono ml-2 shrink-0">
                    {country.dialCode}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
