import DockerContainersList from "@/components/DockerContainersList";

export default function DockerPage() {
  return (
    <div className="container px-4 md:px-8 py-4 md:py-8">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Docker Management</h1>
        <p className="text-muted-foreground">
          Manage your Docker containers here.
        </p>
      </div>
      <DockerContainersList />
    </div>
  );
}
