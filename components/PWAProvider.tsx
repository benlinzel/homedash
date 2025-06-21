"use client";

import PushNotificationManager from "./PushNotificationManager";
import { InstallPrompt } from "./InstallPrompt";

export default function PWAProvider() {
  return (
    <>
      <PushNotificationManager />
      <InstallPrompt />
    </>
  );
}
