// src/modules/client/company-profile/components/CompanyAddress.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Loader2 } from "lucide-react";
import { fetchProvinces, fetchCities, fetchBarangays, PsgcItem } from "@/modules/client/registration/utils/psgc";
import { EditableCompanyFields } from "../types";

interface CompanyAddressProps {
  data: Partial<EditableCompanyFields>;
  onChange: (field: keyof EditableCompanyFields, value: string) => void;
  readOnly?: boolean;
}

export default function CompanyAddress({
  data,
  onChange,
  readOnly = false,
}: CompanyAddressProps) {
  const [provinces, setProvinces] = useState<PsgcItem[]>([]);
  const [cities, setCities] = useState<PsgcItem[]>([]);
  const [barangays, setBarangays] = useState<PsgcItem[]>([]);

  const [selectedProvinceCode, setSelectedProvinceCode] = useState("");
  const [selectedCityCode, setSelectedCityCode] = useState("");

  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingBarangays, setLoadingBarangays] = useState(false);

  // Load Provinces on mount
  useEffect(() => {
    async function loadProvinces() {
      setLoadingProvinces(true);
      try {
        const pList = await fetchProvinces();
        setProvinces(pList);

        if (data.company_province) {
          const matched = pList.find(
            (p) => p.name.toLowerCase() === data.company_province?.toLowerCase()
          );
          if (matched) {
            setSelectedProvinceCode(matched.code);
          }
        }
      } catch (err) {
        console.error("Failed to load provinces", err);
      } finally {
        setLoadingProvinces(false);
      }
    }
    loadProvinces();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load Cities when selectedProvinceCode changes
  useEffect(() => {
    if (!selectedProvinceCode) {
      setCities([]);
      return;
    }

    async function loadCities() {
      setLoadingCities(true);
      try {
        const cList = await fetchCities(selectedProvinceCode);
        setCities(cList);

        if (data.company_city) {
          const matched = cList.find(
            (c) => c.name.toLowerCase() === data.company_city?.toLowerCase()
          );
          if (matched) {
            setSelectedCityCode(matched.code);
          }
        }
      } catch (err) {
        console.error("Failed to load cities", err);
      } finally {
        setLoadingCities(false);
      }
    }
    loadCities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProvinceCode]);

  // Load Barangays when selectedCityCode changes
  useEffect(() => {
    if (!selectedCityCode) {
      setBarangays([]);
      return;
    }

    async function loadBarangays() {
      setLoadingBarangays(true);
      try {
        const bList = await fetchBarangays(selectedCityCode);
        setBarangays(bList);
      } catch (err) {
        console.error("Failed to load barangays", err);
      } finally {
        setLoadingBarangays(false);
      }
    }
    loadBarangays();
  }, [selectedCityCode]);

  const handleProvinceChange = (provinceCode: string) => {
    const selectedProvince = provinces.find((p) => p.code === provinceCode);
    setSelectedProvinceCode(provinceCode);
    setSelectedCityCode("");
    setBarangays([]);

    onChange("company_province", selectedProvince ? selectedProvince.name : "");
    onChange("company_city", "");
    onChange("company_brgy", "");
  };

  const handleCityChange = (cityCode: string) => {
    const selectedCity = cities.find((c) => c.code === cityCode);
    setSelectedCityCode(cityCode);

    onChange("company_city", selectedCity ? selectedCity.name : "");
    onChange("company_brgy", "");
  };

  const handleBrgyChange = (barangayCode: string) => {
    const selectedBgy = barangays.find((b) => b.code === barangayCode);
    onChange("company_brgy", selectedBgy ? selectedBgy.name : "");
  };

  return (
    <div className="space-y-5">
      <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
        <span className="inline-block w-1 h-4 bg-primary rounded-full" />
        Company Address
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="cp-province" className="text-xs font-medium text-zinc-600 dark:text-zinc-400 flex items-center justify-between">
            <span>Province <span className="text-rose-500">*</span></span>
            {!readOnly && loadingProvinces && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
          </Label>
          {readOnly ? (
            <Input
              id="cp-province"
              value={data.company_province ?? ""}
              disabled
              className="h-9 text-sm"
            />
          ) : (
            <SearchableSelect
              options={provinces.map((prov) => ({ value: prov.code, label: prov.name }))}
              value={selectedProvinceCode}
              onValueChange={handleProvinceChange}
              disabled={loadingProvinces}
              placeholder="Select Province"
              className="h-9 border-zinc-200 font-normal focus:ring-2 focus:ring-primary/20 transition-all"
            />
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cp-city" className="text-xs font-medium text-zinc-600 dark:text-zinc-400 flex items-center justify-between">
            <span>City / Municipality <span className="text-rose-500">*</span></span>
            {!readOnly && loadingCities && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
          </Label>
          {readOnly ? (
            <Input
              id="cp-city"
              value={data.company_city ?? ""}
              disabled
              className="h-9 text-sm"
            />
          ) : (
            <SearchableSelect
              options={cities.map((city) => ({ value: city.code, label: city.name }))}
              value={selectedCityCode}
              onValueChange={handleCityChange}
              disabled={!selectedProvinceCode || loadingCities}
              placeholder={
                loadingCities
                  ? "Loading..."
                  : selectedProvinceCode
                  ? "Select City"
                  : "Select province first"
              }
              className="h-9 border-zinc-200 font-normal focus:ring-2 focus:ring-primary/20 transition-all"
            />
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cp-brgy" className="text-xs font-medium text-zinc-600 dark:text-zinc-400 flex items-center justify-between">
            <span>Barangay</span>
            {!readOnly && loadingBarangays && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
          </Label>
          {readOnly ? (
            <Input
              id="cp-brgy"
              value={data.company_brgy ?? ""}
              disabled
              className="h-9 text-sm"
            />
          ) : (
            <SearchableSelect
              options={barangays.map((bgy) => ({ value: bgy.code, label: bgy.name }))}
              value={barangays.find((b) => b.name.toLowerCase() === data.company_brgy?.toLowerCase())?.code || ""}
              onValueChange={handleBrgyChange}
              disabled={!selectedCityCode || loadingBarangays}
              placeholder={
                loadingBarangays
                  ? "Loading..."
                  : selectedCityCode
                  ? "Select Barangay"
                  : "Select city first"
              }
              className="h-9 border-zinc-200 font-normal focus:ring-2 focus:ring-primary/20 transition-all"
            />
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cp-zipcode" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Zip Code
          </Label>
          <Input
            id="cp-zipcode"
            value={data.company_zipCode ?? ""}
            onChange={(e) => onChange("company_zipCode", e.target.value)}
            disabled={readOnly}
            placeholder="e.g. 1200"
            className="h-9 text-sm"
          />
        </div>

        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor="cp-address" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Street Address
          </Label>
          <Input
            id="cp-address"
            value={data.company_address ?? ""}
            onChange={(e) => onChange("company_address", e.target.value)}
            disabled={readOnly}
            placeholder="e.g. Unit 301, The Hub Building, Ayala Ave."
            className="h-9 text-sm"
          />
        </div>
      </div>
    </div>
  );
}
