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
  // @ts-ignore
  if (global.dockerListenerStarted) {
    console.log("Docker event listener already loaded, not starting another.");
    return;
  }
  // @ts-ignore
  global.dockerListenerStarted = true;

  console.log("Attempting to start Docker event listener...");

  const dockerProcess = spawn("docker", ["events", "--format", "{{json .}}"]);

  // This event fires if the process could not be spawned
  dockerProcess.on("error", (err) => {
    console.error("LISTENER-FATAL: Failed to start listener process.", err);
  });

  dockerProcess.stdout.on("data", (data) => {
    const eventString = data.toString();
    // This can be very noisy, but it's essential for debugging
    // console.log(`LISTENER-DATA: Received raw data: ${eventString}`);
    try {
      const event: DockerEvent = JSON.parse(eventString);

      if (
        event.Type === "container" &&
        (event.status === "stop" ||
          event.status === "die" ||
          event.status === "restart")
      ) {
        const containerName = event.Actor.Attributes.name;
        let message = `Container '${containerName}' has ${event.status}.`;

        if (event.status === "die") {
          message = `Oh no! Container '${containerName}' just bit the dust.`;
        } else if (event.status === "stop") {
          message = `Container '${containerName}' has stopped.`;
        } else if (event.status === "restart") {
          message = `Container '${containerName}' is restarting.`;
        }

        console.log(`LISTENER-MATCH: ${message}`);

        sendNotification(message).catch((err) =>
          console.error("LISTENER-NOTIFY-ERROR:", err)
        );
      }
    } catch (error: any) {
      // Docker sometimes sends multiple JSON objects in one data chunk.
      // We can ignore these parse errors as the next chunk should be valid.
    }
  });

  dockerProcess.stderr.on("data", (data) => {
    console.error(`LISTENER-STDERR: ${data}`);
  });

  dockerProcess.on("close", (code) => {
    console.log(`LISTENER-CLOSE: Listener process exited with code ${code}`);
    // @ts-ignore
    global.dockerListenerStarted = false;
  });
}

// Immediately attempt to initialize the listener when this module is imported.
initialize();
