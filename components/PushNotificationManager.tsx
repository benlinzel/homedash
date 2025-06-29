"use client";

import { useEffect, useState } from "react";
import {
  subscribeUser,
  unsubscribeUser,
  sendNotification,
} from "@/app/actions";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

export default function PushNotificationManager() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(
    null
  );
  const [notificationMessage, setNotificationMessage] =
    useState("Test Message");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function setupPushNotifications() {
      if ("serviceWorker" in navigator && "PushManager" in window) {
        try {
          // Register the service worker
          await navigator.serviceWorker.register("/sw.js");

          // Wait for the service worker to be ready
          const registration = await navigator.serviceWorker.ready;

          // Check for an existing subscription
          const subscription = await registration.pushManager.getSubscription();
          if (subscription) {
            setIsSubscribed(true);
            setSubscription(subscription);
          }
        } catch (error) {
          console.error("Error during push notification setup:", error);
        } finally {
          setIsLoading(false);
        }
      } else {
        // Push notifications are not supported
        setIsLoading(false);
      }
    }

    setupPushNotifications();
  }, []);

  const subscribeToPush = async () => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      try {
        const swRegistration = await navigator.serviceWorker.ready;
        const sub = await swRegistration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        });

        await subscribeUser(sub.toJSON() as any);
        setSubscription(sub);
        setIsSubscribed(true);
      } catch (error) {
        console.error("Failed to subscribe to push notifications:", error);
      }
    }
  };

  const unsubscribeFromPush = async () => {
    if (!subscription) return;

    try {
      await subscription.unsubscribe();
      await unsubscribeUser(subscription.toJSON() as any);
      setSubscription(null);
      setIsSubscribed(false);
    } catch (error) {
      console.error("Failed to unsubscribe:", error);
    }
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent the default form submission
    try {
      await sendNotification(notificationMessage);
    } catch (error) {
      console.error("Failed to send notification:", error);
      alert("Failed to send notification. Is the user subscribed?");
    }
  };

  if (isLoading) {
    return null;
  }

  return (
    <div className="p-4 border rounded-lg glassy space-y-4">
      <h3 className="text-lg font-semibold">Push Notifications</h3>
      {isSubscribed ? (
        <div className="space-y-4">
          <p>You are subscribed to push notifications.</p>
          <Button onClick={unsubscribeFromPush} variant="destructive">
            Unsubscribe
          </Button>
          <form
            onSubmit={handleSendNotification}
            className="flex w-full max-w-sm items-center space-x-2"
          >
            <Input
              type="text"
              value={notificationMessage}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setNotificationMessage(e.target.value)
              }
              placeholder="Enter message"
            />
            <Button type="submit">Send Test Notification</Button>
          </form>
        </div>
      ) : (
        <div>
          <p>You are not subscribed. Subscribe to receive notifications.</p>
          <Button onClick={subscribeToPush} className="mt-2">
            Subscribe
          </Button>
        </div>
      )}
    </div>
  );
}
