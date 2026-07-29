"use client";

import React, { useEffect } from "react";
import FreelancerNotificationPreferences from "@/modules/freelancer/freelancer-notifications/components/FreelancerNotificationPreferences";
import { useNotifications } from "@/modules/freelancer/freelancer-notifications/hooks/useNotifications";

export default function NotificationSettings() {
  const {
    preferences,
    quietHours,
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
        quietHours={quietHours}
        loading={prefsLoading}
        saving={saving}
        error={prefsError}
        onSave={savePreferences}
      />
    </div>
  );
}
