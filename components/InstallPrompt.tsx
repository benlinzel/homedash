"use client";

import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { X } from "lucide-react";

export function InstallPrompt() {
  const [isIOS, setIsIOS] = useState(false);
  const [isDismissed, setIsDismissed] = useState(true);

  useEffect(() => {
    const dismissed = localStorage.getItem("installPromptDismissed");
    if (dismissed !== "true") {
      setIsDismissed(false);
    }

    const isIOSDevice =
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);
  }, []);

  const handleDismiss = () => {
    localStorage.setItem("installPromptDismissed", "true");
    setIsDismissed(true);
  };

  if (!isIOS || isDismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 rounded-lg bg-background p-4 text-foreground shadow-lg border flex items-center gap-4">
      <p className="text-sm">
        To install, tap the Share button and then &apos;Add to Home
        Screen&apos;.
      </p>
      <Button variant="ghost" size="icon" onClick={handleDismiss}>
        <X className="h-4 w-4" />
        <span className="sr-only">Dismiss</span>
      </Button>
    </div>
  );
}
