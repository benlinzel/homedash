"use client";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useEffect, useState, useRef } from "react";

interface Device {
  ip: string;
  hostname?: string;
  mac?: string;
}

interface ScanResults {
  timestamp?: string;
  devices: Device[];
}

export default function NetworkScanner() {
  const [results, setResults] = useState<ScanResults>({ devices: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const initialTimestampRef = useRef<string | undefined>(undefined);

  const fetchResults = async () => {
    if (!isLoading) setIsLoading(true);
    try {
      const res = await fetch("/api/network/scan");
      if (res.ok) {
        const data = await res.json();
        setResults(data);
      }
    } catch (error) {
      console.error("Failed to fetch scan results", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, []);

  useEffect(() => {
    if (!isPolling) return;

    const POLLING_INTERVAL = 5000; // 5 seconds
    const POLLING_TIMEOUT = 120000; // 2 minutes

    const pollingStartTime = Date.now();

    const intervalId = setInterval(async () => {
      if (Date.now() - pollingStartTime > POLLING_TIMEOUT) {
        console.error("Polling for scan results timed out.");
        setIsPolling(false);
        setIsScanning(false);
        // TODO: Show a toast to the user
        return;
      }

      try {
        const res = await fetch("/api/network/scan");
        if (res.ok) {
          const data = await res.json();
          if (
            data.timestamp &&
            data.timestamp !== initialTimestampRef.current
          ) {
            setResults(data);
            setIsPolling(false);
          }
        }
      } catch (error) {
        console.error("Polling for scan results failed", error);
        setIsPolling(false);
      }
    }, POLLING_INTERVAL);

    return () => clearInterval(intervalId);
  }, [isPolling]);

  useEffect(() => {
    if (!isPolling) {
      setIsScanning(false);
    }
  }, [isPolling]);

  const startScan = async () => {
    setIsScanning(true);
    initialTimestampRef.current = results.timestamp;

    try {
      const res = await fetch("/api/network/scan", { method: "POST" });
      if (res.status === 202) {
        setIsPolling(true);
      } else if (res.status === 409) {
        // TODO: Show a toast that scan is already in progress
        console.log("A scan is already in progress.");
        setIsScanning(false);
      } else {
        // TODO: Show a toast for other errors
        console.error("Failed to start scan");
        setIsScanning(false);
      }
    } catch (error) {
      console.error("Failed to start scan", error);
      setIsScanning(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <Button onClick={startScan} disabled={isScanning}>
            {isScanning ? "Scanning..." : "Scan Network"}
          </Button>
        </div>
        {results.timestamp && (
          <p className="text-sm text-muted-foreground">
            Last scanned: {new Date(results.timestamp).toLocaleString()}
          </p>
        )}
      </div>
      {isLoading && results.devices.length === 0 ? (
        <p>Loading initial results...</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>IP Address</TableHead>
              <TableHead>Hostname</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.devices?.map((device) => (
              <TableRow key={device.ip}>
                <TableCell>{device.ip}</TableCell>
                <TableCell>{device.hostname || "N/A"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
