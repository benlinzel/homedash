"use client";

import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOnlineStatus } from "./OnlineStatusProvider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Container {
  id: string;
  name: string;
  image: string;
  status: string;
  state: string;
}

type ContainerAction = "start" | "stop" | "restart";

export default function DockerContainersList() {
  const { isOnline } = useOnlineStatus();
  const [containers, setContainers] = useState<Container[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loading, setLoading] = useState<
    Record<string, Record<ContainerAction, boolean>>
  >({});
  const [error, setError] = useState<string | null>(null);

  const fetchContainers = async () => {
    setError(null);
    try {
      const response = await fetch("/api/docker/containers");
      if (!response.ok) {
        throw new Error("Failed to fetch containers");
      }
      const data = await response.json();
      const formattedData = data.map((d: any) => ({
        id: d.ID,
        name: d.Names,
        image: d.Image,
        status: d.Status,
        state: d.State,
      }));
      setContainers(formattedData);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    fetchContainers();
  }, []);

  const handleAction = async (
    containerId: string,
    action: "start" | "stop" | "restart"
  ) => {
    setLoading((prev) => ({
      ...prev,
      [containerId]: { ...prev[containerId], [action]: true },
    }));

    try {
      const response = await fetch(
        `/api/docker/containers/${containerId}/${action}`,
        {
          method: "POST",
        }
      );
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || `Failed to ${action} container.`);
      }
      await fetchContainers(); // Refresh list on success
    } catch (e: any) {
      console.error(e);
      // Optionally, set an error state to be displayed per-container
    } finally {
      setLoading((prev) => ({
        ...prev,
        [containerId]: { ...prev[containerId], [action]: false },
      }));
    }
  };

  const getStatusVariant = (state: string): "default" | "destructive" => {
    return state === "running" ? "default" : "destructive";
  };

  if (initialLoading) {
    return <div>Loading containers...</div>;
  }

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
  }

  return (
    <div>
      {/* Desktop Table */}
      <div className="hidden md:block glassy rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Image</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {containers.map((container) => (
              <TableRow key={container.id}>
                <TableCell className="font-medium">{container.name}</TableCell>
                <TableCell>{container.image}</TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(container.state)}>
                    {container.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        disabled={!isOnline}
                      >
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleAction(container.id, "start")}
                        disabled={loading[container.id]?.start || !isOnline}
                      >
                        {loading[container.id]?.start ? "Starting..." : "Start"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleAction(container.id, "stop")}
                        disabled={loading[container.id]?.stop || !isOnline}
                      >
                        {loading[container.id]?.stop ? "Stopping..." : "Stop"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleAction(container.id, "restart")}
                        disabled={loading[container.id]?.restart || !isOnline}
                      >
                        {loading[container.id]?.restart
                          ? "Restarting..."
                          : "Restart"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <div className="grid gap-4 md:hidden">
        {containers.map((container) => (
          <Card key={container.id} className="glassy">
            <CardHeader>
              <CardTitle className="text-base">{container.name}</CardTitle>
              <Badge
                variant={getStatusVariant(container.state)}
                className="w-fit"
              >
                {container.status}
              </Badge>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {container.image}
            </CardContent>
            <CardFooter className="flex justify-end space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAction(container.id, "start")}
                disabled={loading[container.id]?.start || !isOnline}
              >
                {loading[container.id]?.start ? "Starting..." : "Start"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAction(container.id, "stop")}
                disabled={loading[container.id]?.stop || !isOnline}
              >
                {loading[container.id]?.stop ? "Stopping..." : "Stop"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAction(container.id, "restart")}
                disabled={loading[container.id]?.restart || !isOnline}
              >
                {loading[container.id]?.restart ? "Restarting..." : "Restart"}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
