import { exec } from "child_process";
import { NextResponse } from "next/server";

const VALID_ACTIONS = ["start", "stop", "restart"];

export async function POST(request: any, { params }: any) {
  const { id, action } = params;

  if (!VALID_ACTIONS.includes(action)) {
    return NextResponse.json({ message: "Invalid action." }, { status: 400 });
  }

  const command = `docker ${action} ${id}`;

  return new Promise<NextResponse>((resolve) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Execution error: ${error}`);
        return resolve(
          NextResponse.json(
            { message: `Error ${action}ing container ${id}`, error: stderr },
            { status: 500 }
          )
        );
      }
      return resolve(
        NextResponse.json({
          message: `Container ${id} ${action}ed successfully.`,
          output: stdout,
        })
      );
    });
  });
}
