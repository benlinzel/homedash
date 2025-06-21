"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useOnlineStatus } from "./OnlineStatusProvider";

interface Script {
  id: string;
  title: string;
  description: string;
}

// To track the state of each button individually
type ScriptExecutionState = "idle" | "loading" | "success" | "error";

export default function ScriptsList() {
  const { isOnline } = useOnlineStatus();
  const [scripts, setScripts] = useState<Script[]>([]);
  const [executionStates, setExecutionStates] = useState<
    Record<string, ScriptExecutionState>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchScripts() {
      try {
        const response = await fetch("/api/scripts");
        if (!response.ok) {
          throw new Error("Failed to fetch scripts");
        }
        const data = await response.json();
        setScripts(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "An unknown error occurred"
        );
      } finally {
        setLoading(false);
      }
    }

    fetchScripts();
  }, []);

  const handleRunScript = async (scriptId: string) => {
    setExecutionStates((prev) => ({ ...prev, [scriptId]: "loading" }));
    try {
      const response = await fetch(`/api/scripts/${scriptId}`, {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("Failed to execute script");
      }
      setExecutionStates((prev) => ({ ...prev, [scriptId]: "success" }));
    } catch (err) {
      setExecutionStates((prev) => ({ ...prev, [scriptId]: "error" }));
    } finally {
      // Reset button state after a few seconds
      setTimeout(() => {
        setExecutionStates((prev) => ({ ...prev, [scriptId]: "idle" }));
      }, 3000);
    }
  };

  if (loading) {
    return <div>Loading scripts...</div>;
  }

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
  }

  const getButtonState = (state: ScriptExecutionState) => {
    switch (state) {
      case "loading":
        return {
          text: "Running...",
          disabled: true,
          className: "bg-yellow-500",
        };
      case "success":
        return { text: "Success!", disabled: true, className: "bg-green-500" };
      case "error":
        return { text: "Error!", disabled: true, className: "bg-red-500" };
      default:
        return {
          text: "Run Script",
          disabled: !isOnline,
          className: "bg-primary hover:bg-primary/90",
        };
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {scripts.map((script) => {
        const state = executionStates[script.id] || "idle";
        const { text, disabled, className } = getButtonState(state);

        return (
          <div
            key={script.id}
            className="rounded-xl border bg-card text-card-foreground shadow"
          >
            <div className="p-6">
              <h3 className="font-semibold tracking-tight">{script.title}</h3>
              <p className="text-sm text-muted-foreground">
                {script.description}
              </p>
              <button
                onClick={() => handleRunScript(script.id)}
                disabled={disabled}
                className={cn(
                  "mt-4 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 text-primary-foreground shadow h-9 px-4 py-2",
                  className
                )}
              >
                {text}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
