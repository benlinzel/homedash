import DockerContainersList from "@/components/DockerContainersList";
import ScriptsList from "@/components/ScriptsList";
import SystemStats from "@/components/SystemStats";
import PWAProvider from "@/components/PWAProvider";

export default function Home() {
  return (
    <div className="container px-4 md:px-8 py-4 md:py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          An overview of your system and available actions.
        </p>
      </div>

      <section>
        <h2 className="text-xl font-semibold tracking-tight mb-4">
          Application Settings
        </h2>
        <PWAProvider />
      </section>

      <section>
        <h2 className="text-xl font-semibold tracking-tight mb-4">
          System Stats
        </h2>
        <SystemStats />
      </section>

      <section>
        <h2 className="text-xl font-semibold tracking-tight mb-4">
          System Scripts
        </h2>
        <ScriptsList />
      </section>
    </div>
  );
}
