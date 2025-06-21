"use server";

import webpush, { type PushSubscription } from "web-push";

webpush.setVapidDetails(
  `mailto:${process.env.VAPID_EMAIL!}`,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

// This is a temporary in-memory store for the subscription.
// In a real application, you would store this in a database.
let subscription: PushSubscription | null = null;

export async function subscribeUser(sub: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}) {
  subscription = sub as PushSubscription;
  console.log("User subscribed:", sub);
  return { success: true };
}

export async function unsubscribeUser() {
  subscription = null;
  console.log("User unsubscribed");
  return { success: true };
}

export async function sendNotification(message: string) {
  if (!subscription) {
    console.error("No subscription available to send notification to.");
    throw new Error("No subscription available");
  }

  try {
    await webpush.sendNotification(
      subscription,
      JSON.stringify({
        title: "HomeDash Notification",
        body: message,
        icon: "/icons/android-chrome-192x192.png",
      })
    );
    console.log("Push notification sent successfully.");
    return { success: true };
  } catch (error) {
    console.error("Error sending push notification:", error);
    return { success: false, error: "Failed to send notification" };
  }
}
