import { promises as fs } from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import os from "os";

const execAsync = promisify(exec);

const resultsFilePath = path.join(process.cwd(), "lan-scan.json");

interface Device {
  ip: string;
  hostname?: string;
}

async function getSubnet() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    const ifaceDetails = interfaces[name];
    if (ifaceDetails) {
      for (const iface of ifaceDetails) {
        if (iface.family === "IPv4" && !iface.internal) {
          const parts = iface.address.split(".");
          parts[3] = "0";
          return `${parts.join(".")}/24`;
        }
      }
    }
  }
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
  try {
    const subnet = await getSubnet();
    if (!subnet) {
      return NextResponse.json(
        { message: "Could not determine local subnet." },
        { status: 500 }
      );
    }

    const scriptsPath = path.join(process.cwd(), "scripts.json");
    const scriptsData = await fs.readFile(scriptsPath, "utf-8");
    const scripts = JSON.parse(scriptsData);
    const scanScript = scripts.find((s: any) => s.id === "lan-scan");

    if (!scanScript || !scanScript.command) {
      return NextResponse.json(
        { message: "LAN scan script not found in scripts.json" },
        { status: 404 }
      );
    }

    const command = scanScript.command.replace("{{SUBNET}}", subnet);

    const { stdout, stderr } = await execAsync(command);

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

    await fs.writeFile(resultsFilePath, JSON.stringify(results, null, 2));

    return NextResponse.json(results);
  } catch (error) {
    console.error(error);
    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }
    return NextResponse.json(
      { message: "An unknown error occurred" },
      { status: 500 }
    );
  }
}
