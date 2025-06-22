import NetworkScanner from "@/components/NetworkScanner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NetworkPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Network</h1>
      <Card>
        <CardHeader>
          <CardTitle>Local Network Scan</CardTitle>
        </CardHeader>
        <CardContent>
          <NetworkScanner />
        </CardContent>
      </Card>
    </div>
  );
}
