"use client";

import React, { useEffect } from "react";
import FreelancerNotificationPreferences from "./FreelancerNotificationPreferences";
import { useNotifications } from "@/modules/client/notifications/hooks/useNotifications";

export default function NotificationSettings() {
  const {
    preferences,
    prefsLoading,
    saving,
    prefsError,
    loadPreferences,
    savePreferences,
  } = useNotifications();

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  return (
    <div className="space-y-6">
      <FreelancerNotificationPreferences
        preferences={preferences}
        loading={prefsLoading}
        saving={saving}
        error={prefsError}
        onSave={savePreferences}
      />
    </div>
  );
}
