import React from "react";
import { RequestManagementPage } from "@/modules/vos-admin/request-management";

export const metadata = {
  title: "Request Management | VOS Sync",
};

export default function RequestsRoute() {
  return <RequestManagementPage />;
}
