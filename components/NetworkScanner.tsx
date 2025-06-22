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
import { useEffect, useState } from "react";

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

  const fetchResults = async () => {
    setIsLoading(true);
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

  const startScan = async () => {
    setIsScanning(true);
    try {
      const res = await fetch("/api/network/scan", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setResults(data);
      } else {
        // Maybe show a toast
      }
    } catch (error) {
      console.error("Failed to start scan", error);
      // Maybe show a toast
    } finally {
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
      {isLoading ? (
        <p>Loading...</p>
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
