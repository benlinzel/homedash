import { exec } from "child_process";
import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function POST(request: any, { params }: any) {
  const { id } = params;

  try {
    const scriptsPath = path.join(process.cwd(), "scripts.json");
    const data = await fs.readFile(scriptsPath, "utf-8");
    const scriptsConfig = JSON.parse(data);
    const script = scriptsConfig.find((s: any) => s.id === id);

    if (!script || !script.command) {
      return NextResponse.json(
        { message: "Script not found or has no command" },
        { status: 404 }
      );
    }

    return new Promise<NextResponse>((resolve) => {
      exec(script.command, (error, stdout, stderr) => {
        if (error) {
          console.error(`Execution error: ${error}`);
          return resolve(
            NextResponse.json(
              { message: `Error executing script ${id}`, error: stderr },
              { status: 500 }
            )
          );
        }
        resolve(
          NextResponse.json({
            message: `Script ${id} executed successfully.`,
            output: stdout,
          })
        );
      });
    });
  } catch (error) {
    console.error("Error reading or parsing scripts.json:", error);
    return NextResponse.json(
      { message: "Error processing script request" },
      { status: 500 }
    );
  }
}
