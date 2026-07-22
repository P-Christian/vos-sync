"use client";

// src/modules/client/settings/components/NotificationSettings.tsx

import React, { useEffect } from "react";
import NotificationPreferences from "@/modules/client/notifications/components/NotificationPreferences";
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
      <NotificationPreferences
        preferences={preferences}
        loading={prefsLoading}
        saving={saving}
        error={prefsError}
        onSave={savePreferences}
      />
    </div>
  );
}

