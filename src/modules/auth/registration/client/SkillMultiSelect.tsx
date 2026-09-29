/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronsUpDown, Loader2, Plus, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { searchMasterSkillsAction } from "./skills.actions";
import {
  addSkill,
  hasExactMatch,
  isSameSkill,
  normalizeSkillName,
  removeSkill,
} from "./skill-selection";
import type { SelectedSkill } from "./skill-selection";

export type { SelectedSkill } from "./skill-selection";

export interface SkillMultiSelectProps {
  value: SelectedSkill[];
  onChange: (next: SelectedSkill[]) => void;
  max?: number;
  disabled?: boolean;
  error?: boolean;
  placeholder?: string;
}

function skillKey(skill: SelectedSkill): string {
  return typeof skill.id === "number"
    ? `id:${skill.id}`
    : `name:${normalizeSkillName(skill.skill_name)}`;
}

export function SkillMultiSelect({
  value,
  onChange,
  max = 10,
  disabled = false,
  error = false,
  placeholder = "Search skills...",
}: SkillMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<
    { id: number; skill_name: string }[]
  >([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceRef.current = setTimeout(() => {
      void (async () => {
        try {
          const rows = await searchMasterSkillsAction(trimmed);
          setResults(rows);
        } catch (err) {
          console.error(
            "SkillMultiSelect search failed:",
            err instanceof Error ? err.message : String(err),
          );
          setResults([]);
        } finally {
          setIsSearching(false);
        }
      })();
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [query]);

  const isAtMax = value.length >= max;
  const trimmedQuery = query.trim();
  const showAddRow =
    trimmedQuery.length > 0 && !hasExactMatch(results, trimmedQuery);
  const addRowAlreadySelected =
    showAddRow &&
    value.some((s) => isSameSkill(s, { skill_name: trimmedQuery }));

  const handleSelectResult = (skill: {
    id: number;
    skill_name: string;
  }) => {
    if (isAtMax) return;
    onChange(addSkill(value, skill, max));
    setQuery("");
  };

  const handleAddNew = () => {
    if (isAtMax || trimmedQuery.length === 0) return;
    onChange(addSkill(value, { skill_name: trimmedQuery }, max));
    setQuery("");
  };

  const handleRemove = (skill: SelectedSkill) => {
    onChange(removeSkill(value, skill));
  };

  return (
    <div className="w-full">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            role="combobox"
            aria-expanded={open}
            aria-controls="skill-multiselect-listbox"
            aria-haspopup="listbox"
            disabled={disabled}
            className={cn(
              "flex min-h-12 w-full flex-wrap items-center gap-1.5 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
              value.length === 0 && "text-muted-foreground",
              error && "border-destructive focus-visible:ring-destructive",
            )}
          >
            {value.length === 0 ? (
              <span className="truncate">{placeholder}</span>
            ) : (
              value.map((skill) => (
                <Badge
                  key={skillKey(skill)}
                  variant="secondary"
                  className="py-1 pl-2.5 pr-1"
                >
                  <span className="max-w-36 truncate">{skill.skill_name}</span>
                  <span
                    role="button"
                    tabIndex={disabled ? -1 : 0}
                    aria-label={`Remove ${skill.skill_name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!disabled) handleRemove(skill);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!disabled) handleRemove(skill);
                      }
                    }}
                    className="ml-1 inline-flex shrink-0 cursor-pointer items-center rounded-full p-0.5 hover:bg-muted"
                  >
                    <X className="h-3 w-3" />
                  </span>
                </Badge>
              ))
            )}
            <span className="ml-auto inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
              {value.length}/{max}
              <ChevronsUpDown className="h-4 w-4 opacity-50" />
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[--radix-popover-trigger-width] p-0"
          align="start"
        >
          <Command shouldFilter={false}>
            <CommandInput
              className="text-base md:text-sm"
              placeholder="Type at least 2 characters to search..."
              value={query}
              onValueChange={setQuery}
              disabled={disabled}
            />
            <CommandList id="skill-multiselect-listbox">
              {isSearching ? (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Searching skills...
                </div>
              ) : null}
              <CommandEmpty>
                {trimmedQuery.length >= 2
                  ? "No skills found."
                  : "Type at least 2 characters to search."}
              </CommandEmpty>
              {showAddRow ? (
                <CommandItem
                  value={`add:${trimmedQuery}`}
                  disabled={disabled || isAtMax || addRowAlreadySelected}
                  onSelect={handleAddNew}
                >
                  <Plus className="h-4 w-4" />
                  <span className="truncate">Add &quot;{trimmedQuery}&quot;</span>
                  {addRowAlreadySelected ? (
                    <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                      Added
                    </span>
                  ) : null}
                </CommandItem>
              ) : null}
              {results.map((skill) => {
                const alreadyAdded = value.some((s) =>
                  isSameSkill(s, skill),
                );
                return (
                  <CommandItem
                    key={skill.id}
                    value={`${skill.skill_name}:${skill.id}`}
                    disabled={disabled || alreadyAdded || isAtMax}
                    onSelect={() => handleSelectResult(skill)}
                  >
                    <Check
                      className={cn(
                        "h-4 w-4",
                        alreadyAdded ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="truncate">{skill.skill_name}</span>
                    {alreadyAdded ? (
                      <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                        Added
                      </span>
                    ) : null}
                  </CommandItem>
                );
              })}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {isAtMax ? (
        <p className="mt-1 text-xs text-muted-foreground">
          Maximum {max} skills selected.
        </p>
      ) : null}
    </div>
  );
}
