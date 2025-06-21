"use server";

import webpush, { type PushSubscription } from "web-push";
import { promises as fs } from "fs";
import path from "path";

// Define a writable path for storing subscriptions inside the container.
const DATA_DIR = path.join(process.cwd(), "data");
const SUBSCRIPTIONS_PATH = path.join(DATA_DIR, "subscriptions.json");

webpush.setVapidDetails(
  "mailto:test@example.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

async function getSubscriptions(): Promise<webpush.PushSubscription[]> {
  try {
    const data = await fs.readFile(SUBSCRIPTIONS_PATH, "utf-8");
    return JSON.parse(data);
  } catch (error: any) {
    if (error.code === "ENOENT") {
      // File doesn't exist, so no subscriptions yet.
      return [];
    }
    throw error;
  }
}

async function saveSubscriptions(subscriptions: webpush.PushSubscription[]) {
  try {
    // Ensure the data directory exists
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(
      SUBSCRIPTIONS_PATH,
      JSON.stringify(subscriptions, null, 2)
    );
  } catch (error) {
    console.error("Error saving subscriptions file:", error);
  }
}

export async function subscribeUser(sub: webpush.PushSubscription) {
  const subscriptions = await getSubscriptions();
  console.log("Subscribing user:", sub.endpoint);
  if (!subscriptions.find((s) => s.endpoint === sub.endpoint)) {
    subscriptions.push(sub);
    await saveSubscriptions(subscriptions);
  }
  console.log(`Total subscriptions: ${subscriptions.length}`);
  return { success: true };
}

export async function unsubscribeUser(sub: webpush.PushSubscription) {
  let subscriptions = await getSubscriptions();
  console.log("Unsubscribing user:", sub.endpoint);
  const initialLength = subscriptions.length;
  subscriptions = subscriptions.filter((s) => s.endpoint !== sub.endpoint);
  if (subscriptions.length < initialLength) {
    await saveSubscriptions(subscriptions);
  }
  console.log(`Total subscriptions: ${subscriptions.length}`);
  return { success: true };
}

export async function sendNotification(message: string) {
  const subscriptions = await getSubscriptions();
  if (subscriptions.length === 0) {
    console.log("No subscriptions available to send notification to.");
    return { success: false, error: "No subscriptions available" };
  }

  console.log(`Sending notification to ${subscriptions.length} subscribers.`);

  const notificationPayload = JSON.stringify({
    title: "HomeDash Notification",
    body: message,
    icon: "/icons/android-chrome-192x192.png",
  });

  const sendPromises = subscriptions.map((sub) =>
    webpush.sendNotification(sub, notificationPayload).catch(async (error) => {
      if (error.statusCode === 410) {
        console.log("Subscription expired, removing:", sub.endpoint);
        await unsubscribeUser(sub);
      } else {
        console.error("Error sending push notification:", error);
      }
    })
  );

  await Promise.all(sendPromises);

  return { success: true };
}
