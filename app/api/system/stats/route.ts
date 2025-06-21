import { exec } from "child_process";
import { NextResponse } from "next/server";
import { promisify } from "util";

const execPromise = promisify(exec);

async function getUptime() {
  try {
    if (process.platform === "darwin") {
      // macOS command
      const { stdout } = await execPromise("uptime");
      const match = stdout.match(/up (.*), \d+ users?/);
      if (match) return match[1];
      return "N/A";
    } else {
      // Linux command
      const { stdout } = await execPromise("cat /proc/uptime");
      const uptimeSeconds = parseFloat(stdout.split(" ")[0]);
      const days = Math.floor(uptimeSeconds / (24 * 3600));
      const hours = Math.floor((uptimeSeconds % (24 * 3600)) / 3600);
      const minutes = Math.floor((uptimeSeconds % 3600) / 60);
      return `${days}d ${hours}h ${minutes}m`;
    }
  } catch (e) {
    console.error("Couldn't get uptime", e);
    return "N/A";
  }
}

async function getMemory() {
  try {
    if (process.platform === "darwin") {
      // macOS command
      const { stdout: totalMemOut } = await execPromise("sysctl -n hw.memsize");
      const totalMemBytes = parseInt(totalMemOut, 10);

      // Using top to get used memory is more reliable on mac
      const { stdout: topOut } = await execPromise("top -l 1 | grep PhysMem");
      const usedMemMatch = topOut.match(/(\d+[MGB]) used/);

      const used = usedMemMatch ? usedMemMatch[1] : "N/A";
      const total = `${(totalMemBytes / 1024 / 1024).toFixed(0)}MB`;

      return { total, used };
    } else {
      // Linux command
      const { stdout } = await execPromise("free -m");
      const lines = stdout.split("\\n");
      const memLine = lines.find((line) => line.startsWith("Mem:"));
      if (!memLine) return { total: "N/A", used: "N/A" };

      const stats = memLine.split(/\s+/);
      return {
        total: `${stats[1]}MB`,
        used: `${stats[2]}MB`,
      };
    }
  } catch (e) {
    console.error("Couldn't get memory", e);
    return { total: "N/A", used: "N/A" };
  }
}

async function getDisk() {
  try {
    // df works on both, but let's be safe
    const { stdout } = await execPromise("df -h /");
    const lines = stdout.split("\\n");
    const diskLine = lines[1];
    if (!diskLine) return { total: "N/A", used: "N/A", usePercentage: "N/A" };

    const stats = diskLine.split(/\s+/);

    if (process.platform === "darwin") {
      return {
        total: stats[1],
        used: stats[2],
        usePercentage: stats[4],
      };
    } else {
      return {
        total: stats[1],
        used: stats[2],
        usePercentage: stats[4],
      };
    }
  } catch (e) {
    console.error("Couldn't get disk", e);
    return { total: "N/A", used: "N/A", usePercentage: "N/A" };
  }
}

export async function GET() {
  try {
    const [uptime, memory, disk] = await Promise.all([
      getUptime(),
      getMemory(),
      getDisk(),
    ]);

    return NextResponse.json({ uptime, memory, disk });
  } catch (error) {
    console.error("Error fetching system stats:", error);
    return NextResponse.json(
      { error: "Could not load system stats." },
      { status: 500 }
    );
  }
}
