import { promises as fs } from "fs";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const file = await fs.readFile(process.cwd() + "/scripts.json", "utf8");
    const data = JSON.parse(file);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error reading scripts.json:", error);
    return NextResponse.json(
      { error: "Could not load scripts." },
      { status: 500 }
    );
  }
}
