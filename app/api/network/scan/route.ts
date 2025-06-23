import { promises as fs } from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const resultsFilePath = path.join(process.cwd(), "data", "lan-scan.json");

let isScanRunning = false;

interface Device {
  ip: string;
  hostname?: string;
}

export async function GET() {
  try {
    const data = await fs.readFile(resultsFilePath, "utf-8");
    return NextResponse.json(JSON.parse(data));
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return NextResponse.json({ devices: [] });
    }
    return NextResponse.json(
      { message: "Failed to read scan results" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  console.log("Received request to start network scan.");
  if (isScanRunning) {
    console.log("Scan is already running. Rejecting request.");
    return NextResponse.json(
      { message: "A scan is already in progress." },
      { status: 409 }
    );
  }

  isScanRunning = true;

  // This command runs a temporary Docker container with nmap installed.
  // It uses host networking to discover the local LAN subnet automatically.
  // The `-n` flag is crucial to prevent DNS resolution, which can cause hangs.
  // The command is wrapped in `sh -c` and the dollar signs are escaped to ensure that
  // the subnet discovery `$(ip ...)` and awk's `$4` are executed *inside* the temporary container.
  const command =
    "docker run --rm --net=host --entrypoint sh instrumentisto/nmap -c \"nmap -n -sn -oG - \\$(ip -o -f inet addr show | awk '/scope global/ {print \\\\$4}' | head -n 1)\"";

  try {
    console.log(`Executing network scan with command: ${command}`);
    // Run scan in the background, do not await
    execAsync(command)
      .then(({ stdout, stderr }) => {
        if (stderr) {
          console.error(`nmap stderr: ${stderr}`);
        }
        const devices: Device[] = stdout
          .split("\n")
          .filter((line) => line.startsWith("Host:"))
          .map((line) => {
            const parts = line.split(" ");
            const ip = parts[1];
            const hostname = parts[2]?.replace("(", "").replace(")", "");
            return { ip, hostname: hostname || undefined };
          })
          .filter((device) => device.ip);

        const results = {
          timestamp: new Date().toISOString(),
          devices,
        };

        return fs.writeFile(resultsFilePath, JSON.stringify(results, null, 2));
      })
      .then(() => {
        console.log("Network scan complete. Results saved.");
      })
      .catch((error) => {
        console.error("Error during background network scan:", error);
      })
      .finally(() => {
        isScanRunning = false;
      });

    return NextResponse.json({ message: "Scan initiated" }, { status: 202 });
  } catch (error) {
    isScanRunning = false;
    console.error("Error preparing network scan:", error);
    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }
    return NextResponse.json(
      { message: "An unknown error occurred" },
      { status: 500 }
    );
  }
}
