import React from "react";
import { RequestManagementPage } from "@/modules/vos-admin/request-management";
import { getEducationVerificationMode } from "@/modules/education-verification/attendance-flow-gate";

export const metadata = {
  title: "Request Management | VOS Sync",
};

export default function RequestsRoute() {
  // Plan 2 Todo 7 lane A mode signal: the server-only gate is read HERE in
  // the server page and passed down as a plain `mode` prop
  // (RequestManagementPage -> SchoolRequestsTab). No public mode API exists;
  // client components never import the server-only gate module.
  // An invalid mode fails closed to the frozen (read-only) posture instead of
  // the 500 error boundary, matching the review API's sanitized 503.
  let mode: ReturnType<typeof getEducationVerificationMode>;
  try {
    mode = getEducationVerificationMode();
  } catch {
    mode = "frozen";
  }
  return <RequestManagementPage mode={mode} />;
}
