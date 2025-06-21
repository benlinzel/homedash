"use client";

import { createContext, useContext, useEffect, useState } from "react";

interface OnlineStatusContextType {
  isOnline: boolean;
}

const OnlineStatusContext = createContext<OnlineStatusContextType>({
  isOnline: true,
});

export function OnlineStatusProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Check status on initial load
    handleCheckStatus();

    // Add event listeners for browser's online/offline events
    window.addEventListener("online", () => handleSetOnline(true));
    window.addEventListener("offline", () => handleSetOnline(false));

    // Set up polling to check server connectivity
    const interval = setInterval(handleCheckStatus, 10000); // Poll every 10 seconds

    return () => {
      window.removeEventListener("online", () => handleSetOnline(true));
      window.removeEventListener("offline", () => handleSetOnline(false));
      clearInterval(interval);
    };
  }, []);

  const handleSetOnline = (status: boolean) => {
    setIsOnline(status);
  };

  const handleCheckStatus = async () => {
    try {
      const response = await fetch("/api/heartbeat", {
        method: "GET",
        headers: { "Cache-Control": "no-cache" },
      });
      // Consider successful if response is ok (status 200-299)
      handleSetOnline(response.ok);
    } catch (error) {
      // Fetch fails if server is down or network error
      handleSetOnline(false);
    }
  };

  return (
    <OnlineStatusContext.Provider value={{ isOnline }}>
      {children}
    </OnlineStatusContext.Provider>
  );
}

export const useOnlineStatus = () => {
  return useContext(OnlineStatusContext);
};
