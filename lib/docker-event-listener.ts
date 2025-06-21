import { spawn } from "child_process";
import { sendNotification } from "@/app/actions";

interface DockerEvent {
  status: "start" | "stop" | "die" | "restart";
  id: string;
  from: string;
  Type: "container";
  Action: "start" | "stop" | "die" | "restart";
  Actor: {
    ID: string;
    Attributes: {
      name: string;
      [key: string]: string;
    };
  };
  scope: "local";
  Time: number;
  TimeNano: number;
}

function initialize() {
  // Use a global variable to ensure this only runs once.
  // @ts-ignore
  if (global.dockerListenerStarted) {
    return;
  }
  // @ts-ignore
  global.dockerListenerStarted = true;

  console.log("Starting Docker event listener...");

  const dockerProcess = spawn("docker", ["events", "--format", "{{json .}}"]);

  dockerProcess.stdout.on("data", (data) => {
    const eventString = data.toString();
    try {
      const event: DockerEvent = JSON.parse(eventString);

      // We only care about container events that indicate a potential issue.
      if (
        event.Type === "container" &&
        (event.status === "stop" ||
          event.status === "die" ||
          event.status === "restart")
      ) {
        const containerName = event.Actor.Attributes.name;
        const message = `Container '${containerName}' ${event.status}.`;
        console.log(`[Docker Event] ${message}`);

        // Send a push notification
        sendNotification(message).catch(console.error);
      }
    } catch (error) {
      // sometimes docker events sends multiple jsons, so we ignore parse errors
    }
  });

  dockerProcess.stderr.on("data", (data) => {
    console.error(`Docker event listener error: ${data}`);
  });

  dockerProcess.on("close", (code) => {
    console.log(`Docker event listener exited with code ${code}`);
    // @ts-ignore
    global.dockerListenerStarted = false;
  });
}

// Immediately attempt to initialize the listener when this module is imported.
initialize();
