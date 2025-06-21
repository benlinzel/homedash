"use client";

import { useEffect, useState } from "react";

export function InstallPrompt() {
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const isIOSDevice =
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);
  }, []);

  if (!isIOS) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 rounded-lg bg-background p-4 text-foreground shadow-lg border">
      <p className="text-sm">
        To install, tap the Share button and then &apos;Add to Home
        Screen&apos;.
      </p>
    </div>
  );
}
