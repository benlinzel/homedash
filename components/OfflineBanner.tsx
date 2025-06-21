"use client";

import { useOnlineStatus } from "@/components/OnlineStatusProvider";
import { WifiOff } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

export function OfflineBanner() {
  const { isOnline } = useOnlineStatus();

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ y: -50 }}
          animate={{ y: 0 }}
          exit={{ y: -50 }}
          transition={{ duration: 0.3 }}
          className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center bg-destructive text-destructive-foreground p-2 text-sm"
        >
          <WifiOff className="h-4 w-4 mr-2" />
          <span>Connection lost. Reconnecting...</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
