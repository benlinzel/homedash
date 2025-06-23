import { promises as fs } from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";

const resultsFilePath = path.join(process.cwd(), "data", "lan-scan.json");

let isScanRunning = false;

interface Device {
  ip: string;
  hostname?: string;
  mac?: string;
  name?: string;
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

  const subnet = process.env.DEFAULT_SUBNET;
  if (!subnet) {
    return NextResponse.json(
      { message: "DEFAULT_SUBNET is not set in the environment." },
      { status: 500 }
    );
  }

  const subnetRegex = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d{1,2}$/;
  if (!subnetRegex.test(subnet)) {
    return NextResponse.json(
      { message: "Invalid subnet format in DEFAULT_SUBNET." },
      { status: 500 }
    );
  }

  isScanRunning = true;

  const command = "docker";
  const args = [
    "run",
    "--rm",
    "--net=host",
    "--cap-add=NET_RAW",
    "--cap-add=NET_ADMIN",
    "instrumentisto/nmap",
    "-n",
    "-sn",
    subnet,
  ];

  try {
    console.log(
      `Executing network scan with command: ${command} ${args.join(" ")}`
    );
    const nmapProcess = spawn(command, args);

    let stdout = "";
    let stderr = "";

    nmapProcess.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    nmapProcess.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    nmapProcess.on("error", (err) => {
      isScanRunning = false;
      console.error("Failed to start nmap process:", err);
    });

    nmapProcess.on("close", (code) => {
      console.log(`nmap process exited with code ${code}`);

      console.log("--- nmap stdout ---");
      console.log(stdout);
      console.log("--- end nmap stdout ---");

      if (stderr) {
        console.error("--- nmap stderr ---");
        console.error(stderr);
        console.error("--- end nmap stderr ---");
      }

      isScanRunning = false;

      if (code !== 0) {
        console.error(
          "nmap scan failed (exited with non-zero code). Not saving results."
        );
        return;
      }

      // Parse both grepable and standard nmap output for hosts and MAC addresses
      const lines = stdout.split("\n");
      const devices: Device[] = [];
      let lastDevice: Device | null = null;
      for (const line of lines) {
        if (line.startsWith("Host:")) {
          // Grepable output: Host: 10.0.0.1 (hostname)    Status: Up
          const match = line.match(/^Host:\s+(\S+)(?:\s+\(([^)]*)\))?/);
          if (!match) continue;
          const ip = match[1];
          const hostname = match[2] && match[2] !== "" ? match[2] : undefined;
          lastDevice = { ip, hostname };
          devices.push(lastDevice);
        } else if (line.startsWith("Nmap scan report for ")) {
          // Standard output: Nmap scan report for 10.0.0.159 or Nmap scan report for hostname (10.0.0.159)
          const match = line.match(
            /^Nmap scan report for (.+?)(?: \((\d+\.\d+\.\d+\.\d+)\))?$/
          );
          if (!match) continue;
          let ip: string | undefined;
          let hostname: string | undefined;
          if (match[2]) {
            hostname = match[1];
            ip = match[2];
          } else {
            ip = match[1];
          }
          lastDevice = { ip, hostname };
          devices.push(lastDevice);
        } else if (line.includes("MAC Address:") && lastDevice) {
          // MAC Address: AA:BB:CC:DD:EE:FF (DeviceName)
          const macMatch = line.match(
            /MAC Address: ([0-9A-Fa-f:]+)(?: \(([^)]+)\))?/
          );
          if (macMatch) {
            lastDevice.mac = macMatch[1];
            if (macMatch[2]) {
              lastDevice.name = macMatch[2];
            }
          }
        }
      }

      const results = {
        timestamp: new Date().toISOString(),
        devices,
      };

      fs.writeFile(resultsFilePath, JSON.stringify(results, null, 2))
        .then(() => {
          console.log("Network scan complete. Results saved.");
        })
        .catch((err) => {
          console.error("Failed to write scan results file:", err);
        });
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
