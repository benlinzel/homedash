import { promises as fs } from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import os from "os";

const execAsync = promisify(exec);

const resultsFilePath = path.join(process.cwd(), "lan-scan.json");

let isScanRunning = false;

interface Device {
  ip: string;
  hostname?: string;
}

function getSubnetFromInterface(): string | null {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    const ifaceDetails = interfaces[name];
    if (ifaceDetails) {
      for (const iface of ifaceDetails) {
        // We are looking for the primary, non-internal IPv4 interface
        if (iface.family === "IPv4" && !iface.internal) {
          // The 'cidr' property is the most reliable way to get the subnet
          if (iface.cidr) {
            return iface.cidr;
          }
        }
      }
    }
  }
  console.warn("Could not determine local subnet from network interfaces.");
  return null;
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
  try {
    console.log("Determining subnet...");
    const subnet = getSubnetFromInterface();
    if (!subnet) {
      console.error("Failed to determine subnet.");
      isScanRunning = false;
      return NextResponse.json(
        { message: "Could not determine local subnet." },
        { status: 500 }
      );
    }
    console.log(`Subnet determined: ${subnet}`);

    let command: string;
    try {
      const scriptsPath = path.join(process.cwd(), "scripts.json");
      const scriptsData = await fs.readFile(scriptsPath, "utf-8");
      const scripts = JSON.parse(scriptsData);
      const scanScript = scripts.find((s: any) => s.id === "lan-scan");

      if (!scanScript || typeof scanScript.command !== "string") {
        throw new Error(
          "Scan command is invalid or not found in scripts.json."
        );
      }
      command = scanScript.command.replace("{{SUBNET}}", subnet);
    } catch (error) {
      console.error("Failed to read or parse scan script:", error);
      // Fallback to a default nmap command if scripts.json is problematic
      command = `nmap -sn ${subnet}`;
    }

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
