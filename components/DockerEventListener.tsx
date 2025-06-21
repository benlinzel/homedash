// @ts-nocheck
"use server";

import { startDockerEventListener } from "@/lib/docker-event-listener";

// This is a simple server component that will trigger the Docker event listener to start.
// By placing it in the root layout, we ensure it runs once when the server starts.
// The @ts-nocheck and "use server" directives are important here.

if (process.env.NODE_ENV === "production") {
  startDockerEventListener();
} else {
  // In development, hot-reloading can cause multiple listeners to spawn.
  // We use a global variable to ensure it only starts once.
  if (!global.dockerListenerStarted) {
    startDockerEventListener();
    global.dockerListenerStarted = true;
  }
}

export function DockerEventListener() {
  // This component renders nothing in the UI.
  // Its only purpose is to be included in the server-side render
  // to trigger the event listener.
  return null;
}
