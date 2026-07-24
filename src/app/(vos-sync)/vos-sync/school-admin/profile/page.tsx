import { redirect } from "next/navigation";

export default function ProfileRedirectPage() {
  redirect("/vos-sync/school-admin/settings");
}
