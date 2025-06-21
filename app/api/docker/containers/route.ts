import { exec } from "child_process";
import { NextResponse } from "next/server";

export async function GET() {
  const command = `docker ps -a --format '{{json .}}'`;

  return new Promise<NextResponse>((resolve) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Execution error: ${error}`);
        const response = NextResponse.json(
          {
            message: `Error listing containers`,
            error: stderr,
          },
          { status: 500 }
        );
        resolve(response);
        return;
      }

      // The command outputs JSON objects on new lines, so we need to parse them
      const containers = stdout
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line));

      const response = NextResponse.json(containers);
      resolve(response);
    });
  });
}
