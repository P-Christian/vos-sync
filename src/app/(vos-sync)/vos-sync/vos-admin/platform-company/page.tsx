import React from "react";
import PlatformCompanyModule from "@/modules/vos-admin/platform-company";

export const metadata = {
  title: "Platform Company | VOS Sync Admin",
  description: "Manage internal platform operating entities and public company profiles for landing pages.",
};

export default function PlatformCompanyPage() {
  return <PlatformCompanyModule />;
}
