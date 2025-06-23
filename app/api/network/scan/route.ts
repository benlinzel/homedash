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
  const defaultSubnet = process.env.DEFAULT_SUBNET || "";
  try {
    const data = await fs.readFile(resultsFilePath, "utf-8");
    const results = JSON.parse(data);
    return NextResponse.json({ ...results, defaultSubnet });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return NextResponse.json({ devices: [], defaultSubnet });
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

  const { subnet } = await req.json();

  if (!subnet) {
    return NextResponse.json(
      { message: "Subnet is required." },
      { status: 400 }
    );
  }

  // Basic validation for the subnet format.
  // This is not exhaustive but prevents trivial errors.
  const subnetRegex = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d{1,2}$/;
  if (!subnetRegex.test(subnet)) {
    return NextResponse.json(
      { message: "Invalid subnet format." },
      { status: 400 }
    );
  }

  isScanRunning = true;

  const command = `docker run --rm --net=host --cap-add=NET_RAW --cap-add=NET_ADMIN instrumentisto/nmap -n -sn ${subnet}`;

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
