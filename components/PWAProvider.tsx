"use client";

import { PushNotificationManager } from "./PushNotificationManager";
import { InstallPrompt } from "./InstallPrompt";

export function PWAProvider() {
  return (
    <>
      <PushNotificationManager />
      <InstallPrompt />
    </>
  );
}
