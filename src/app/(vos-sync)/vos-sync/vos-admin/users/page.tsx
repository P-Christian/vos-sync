import React from "react";
import { UserManagementPage } from "@/modules/vos-admin/user-management";

export const metadata = {
  title: "User Management | VOS Sync",
};

export default function UsersRoute() {
  return <UserManagementPage />;
}
