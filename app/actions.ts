"use server";

import webpush, { type PushSubscription } from "web-push";

webpush.setVapidDetails(
  "mailto:test@example.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

// This is a temporary in-memory store for subscriptions.
// In a real application, you would store this in a database.
const subscriptions: webpush.PushSubscription[] = [];

export async function subscribeUser(sub: webpush.PushSubscription) {
  console.log("Subscribing user:", sub.endpoint);
  // Avoid adding duplicate subscriptions
  if (!subscriptions.find((s) => s.endpoint === sub.endpoint)) {
    subscriptions.push(sub);
  }
  console.log(`Total subscriptions: ${subscriptions.length}`);
  return { success: true };
}

export async function unsubscribeUser(sub: webpush.PushSubscription) {
  console.log("Unsubscribing user:", sub.endpoint);
  const index = subscriptions.findIndex((s) => s.endpoint === sub.endpoint);
  if (index > -1) {
    subscriptions.splice(index, 1);
  }
  console.log(`Total subscriptions: ${subscriptions.length}`);
  return { success: true };
}

export async function sendNotification(message: string) {
  if (subscriptions.length === 0) {
    console.error("No subscriptions available to send notification to.");
    return { success: false, error: "No subscriptions available" };
  }

  console.log(`Sending notification to ${subscriptions.length} subscribers.`);

  const notificationPayload = JSON.stringify({
    title: "HomeDash Notification",
    body: message,
    icon: "/icons/android-chrome-192x192.png",
  });

  const sendPromises = subscriptions.map((sub) =>
    webpush.sendNotification(sub, notificationPayload).catch((error) => {
      // If a subscription is expired or invalid, remove it.
      if (error.statusCode === 410) {
        unsubscribeUser(sub);
      } else {
        console.error("Error sending push notification:", error);
      }
    })
  );

  await Promise.all(sendPromises);

  return { success: true };
}
