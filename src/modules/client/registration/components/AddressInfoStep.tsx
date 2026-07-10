// src/modules/client/registration/components/AddressInfoStep.tsx
import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RegistrationStepProps } from "../types";
import { fetchProvinces, fetchCities, fetchBarangays, PsgcItem } from "../utils/psgc";
import { Loader2, MapPin, Navigation, Hash } from "lucide-react";

export default function AddressInfoStep({ formData, updateFields, onNext, onBack }: RegistrationStepProps) {
  const [provinces, setProvinces] = useState<PsgcItem[]>([]);
  const [cities, setCities] = useState<PsgcItem[]>([]);
  const [barangays, setBarangays] = useState<PsgcItem[]>([]);

  const [selectedProvinceCode, setSelectedProvinceCode] = useState("");
  const [selectedCityCode, setSelectedCityCode] = useState("");

  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingBarangays, setLoadingBarangays] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const address = formData.address || {
    company_province: "",
    company_city: "",
    company_brgy: "",
    company_address: "",
    company_zipCode: "",
  };

  // Load Provinces on mount
  useEffect(() => {
    async function loadProvinces() {
      setLoadingProvinces(true);
      try {
        const data = await fetchProvinces();
        setProvinces(data);

        // If editing/returning and we have a province name, try to restore the code
        if (address.company_province) {
          const matched = data.find(p => p.name === address.company_province);
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
        const data = await fetchCities(selectedProvinceCode);
        setCities(data);

        // Restore city code if matching name exists
        if (address.company_city) {
          const matched = data.find(c => c.name === address.company_city);
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
        const data = await fetchBarangays(selectedCityCode);
        setBarangays(data);
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

    updateFields({
      address: {
        ...address,
        company_province: selectedProvince ? selectedProvince.name : "",
        company_city: "",
        company_brgy: "",
      },
    });

    if (errors.company_province) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.company_province;
        return next;
      });
    }
  };

  const handleCityChange = (cityCode: string) => {
    const selectedCity = cities.find((c) => c.code === cityCode);
    setSelectedCityCode(cityCode);

    updateFields({
      address: {
        ...address,
        company_city: selectedCity ? selectedCity.name : "",
        company_brgy: "",
      },
    });

    if (errors.company_city) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.company_city;
        return next;
      });
    }
  };

  const handleChange = (field: string, value: string) => {
    updateFields({
      address: {
        ...address,
        [field]: value,
      },
    });
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleValidation = () => {
    const newErrors: Record<string, string> = {};
    if (!address.company_province) newErrors.company_province = "Province is required";
    if (!address.company_city) newErrors.company_city = "City is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (handleValidation()) {
      onNext();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-slide-in">
      <div className="space-y-4">
        <div className="border-b border-zinc-100 dark:border-zinc-800/80 pb-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Corporate Address</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
              <span>Province *</span>
              {loadingProvinces && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
            </label>
            <div className="relative">
              <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none z-10" />
              <Select value={selectedProvinceCode} onValueChange={handleProvinceChange} disabled={loadingProvinces}>
                <SelectTrigger className="pl-10 h-11 border-zinc-200 focus:ring-2 focus:ring-primary/20 transition-all">
                  <SelectValue placeholder={loadingProvinces ? "Loading provinces..." : "Select Province"} />
                </SelectTrigger>
                <SelectContent>
                  {provinces.map((prov) => (
                    <SelectItem key={prov.code} value={prov.code}>
                      {prov.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {errors.company_province && <p className="text-xs text-rose-500 font-medium mt-1">{errors.company_province}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
              <span>City / Municipality *</span>
              {loadingCities && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
            </label>
            <div className="relative">
              <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none z-10" />
              <Select
                value={selectedCityCode}
                onValueChange={handleCityChange}
                disabled={!selectedProvinceCode || loadingCities}
              >
                <SelectTrigger className="pl-10 h-11 border-zinc-200 focus:ring-2 focus:ring-primary/20 transition-all">
                  <SelectValue
                    placeholder={
                      loadingCities
                        ? "Loading cities..."
                        : selectedProvinceCode
                        ? "Select City"
                        : "Select province first"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {cities.map((city) => (
                    <SelectItem key={city.code} value={city.code}>
                      {city.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {errors.company_city && <p className="text-xs text-rose-500 font-medium mt-1">{errors.company_city}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
              <span>Barangay (Optional)</span>
              {loadingBarangays && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
            </label>
            <div className="relative">
              <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none z-10" />
              <Select
                value={barangays.find((b) => b.name === address.company_brgy)?.code || ""}
                onValueChange={(val) => {
                  const selectedBgy = barangays.find((b) => b.code === val);
                  handleChange("company_brgy", selectedBgy ? selectedBgy.name : "");
                }}
                disabled={!selectedCityCode || loadingBarangays}
              >
                <SelectTrigger className="pl-10 h-11 border-zinc-200 focus:ring-2 focus:ring-primary/20 transition-all">
                  <SelectValue
                    placeholder={
                      loadingBarangays
                        ? "Loading barangays..."
                        : selectedCityCode
                        ? "Select Barangay"
                        : "Select city first"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {barangays.map((bgy) => (
                    <SelectItem key={bgy.code} value={bgy.code}>
                      {bgy.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">ZIP Code (Optional)</label>
            <div className="relative">
              <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
              <Input
                type="text"
                placeholder="e.g. 1200"
                value={address.company_zipCode || ""}
                onChange={(e) => handleChange("company_zipCode", e.target.value)}
                className="pl-10 w-full h-11 border-zinc-200 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-all duration-200"
              />
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Street Address (Optional)</label>
          <div className="relative">
            <Navigation className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
            <Input
              type="text"
              placeholder="e.g. 6789 Ayala Avenue, Tower 1"
              value={address.company_address || ""}
              onChange={(e) => handleChange("company_address", e.target.value)}
              className="pl-10 w-full h-11 border-zinc-200 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-all duration-200"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-4 pt-6">
        {onBack && (
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            className="w-1/3 h-11 border-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors duration-200"
          >
            Back
          </Button>
        )}
        <Button
          type="submit"
          className="flex-1 h-11 bg-primary text-white hover:bg-primary/95 font-medium rounded-lg text-base shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
        >
          Next: Agreements & Consent
        </Button>
      </div>
    </form>
  );
}

