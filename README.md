# HomeDash

HomeDash is a secure, Progressive Web App (PWA) dashboard for managing Docker containers and running system scripts on a server. It runs entirely in a single Next.js application container, connecting directly to the Docker daemon via the Docker socket. The app is designed to be lightweight, modular, and extendable, with secure access through Cloudflare Tunnel and Cloudflare Zero Trust.

---

## Features

### Frontend

- **PWA Compatible**: Fully installable on desktop and mobile with offline shell support via a service worker.
- **Responsive UI**: Built with Tailwind CSS for a seamless experience on any device.
- **Component Library**: Uses [shadcn-ui](https://ui.shadcn.com/) for a set of reusable and accessible components.
- **Icons**: Features beautiful icons from the [Lucide](https://lucide.dev/) icon library.
- **Docker Management**: View all Docker containers with their name, image, and status. Easily start, stop, and restart containers from the UI.
- **System Stats**: A real-time view of basic system statistics, including CPU, memory, disk usage, and uptime.
- **Modular System Scripts**: A UI to execute custom scripts, dynamically loaded from a `scripts.json` configuration file.
- **Offline Detection & Auto-Reconnect**:
  - A heartbeat polls the backend every 5-10 seconds.
  - A clear banner notifies you when the server is unreachable, and UI controls are disabled.
  - The app automatically retries the connection and restores functionality once the server is back online.

### Backend (Next.js API Routes)

- **Unified Backend**: All backend logic runs within Next.js API routes, eliminating the need for a separate server.
- **Direct Docker Control**: Manages Docker by executing CLI commands (`docker ps`, `docker start`, etc.) via Node.js `child_process`, requiring no extra Docker libraries.
- **System Stats**: Gathers system stats using standard Linux shell commands (`free`, `df`, `/proc/uptime`).
- **Configurable Scripts**: The API loads and executes scripts defined in `scripts.json`, allowing for easy extension.
- **Health Check**: A lightweight `/api/heartbeat` endpoint for health checks and offline detection.

---

## Security & Deployment

- **Secure by Design**: The public GitHub repository is safe to use as no sensitive information (keys, paths, etc.) is ever hardcoded.
- **External Configuration**: All sensitive configuration is handled via externally mounted files (`.env` and `scripts.json`) that are not committed to source control.
- **Cloudflare Tunnel**: Designed to be exposed exclusively through a Cloudflare Tunnel, which secures the frontend and backend APIs.
- **Zero Trust Access**: Access is controlled by Cloudflare Zero Trust policies, such as an email whitelist, ensuring only authorized users can reach the dashboard.
- **Docker Deployment**: The application is designed to run in a Docker container with:
  - The Docker socket mounted: `/var/run/docker.sock:/var/run/docker.sock`.
  - Environment variables injected at runtime.
  - Configuration files mounted as volumes for easy management.

---

## Configuration Files

### `.env`

Provide environment variables for the application.

```env
# Example .env content
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
```

**Note:** Do **not** commit `.env` to your repository. Use `.env.example` as a template.

### `scripts.json`

Define a list of system scripts that can be executed from the UI.

```json
[
  {
    "id": "reboot-server",
    "title": "Reboot Server",
    "description": "Reboots the entire host machine safely.",
    "command": "sudo /sbin/reboot"
  },
  {
    "id": "docker-cleanup",
    "title": "Docker Cleanup",
    "description": "Remove dangling images and unused containers.",
    "command": "docker system prune -f"
  }
]
```

**Note:** For scripts requiring elevated privileges (like `reboot`), ensure the container user has the necessary `sudoers` configuration for passwordless execution.

---

## API Endpoints

| Method | Endpoint                               | Description                          |
| ------ | -------------------------------------- | ------------------------------------ |
| GET    | `/api/heartbeat`                       | Lightweight server health check      |
| GET    | `/api/system/stats`                    | Get system CPU, memory, disk, uptime |
| GET    | `/api/docker/containers`               | List all Docker containers           |
| POST   | `/api/docker/containers/[id]/[action]` | Start, stop, or restart a container  |
| GET    | `/api/scripts`                         | List all configured system scripts   |
| POST   | `/api/scripts/[id]`                    | Execute a specified system script    |

---

## Environment Configuration

Create a `.env` file in the root of the project by copying the example:

```bash
cp .env.example .env
```

You will need to set one variable: `DOCKER_GID`.

### Finding the Docker Group ID (`DOCKER_GID`)

The application needs to communicate with the Docker daemon on the host. To do this securely, the user inside the container needs to be part of the `docker` group, which requires knowing the group's ID (GID) on your host machine.

- **On Linux (including Ubuntu):**

  You can find the GID by running:

  ```bash
  getent group docker | cut -d: -f3
  ```

  This will output a number. If this command fails, you may need to create the docker group first (`sudo groupadd docker`) and add your user to it (`sudo usermod -aG docker $USER`).

- **On macOS / Windows (with Docker Desktop):**

  Docker Desktop uses a virtualized environment. The GID for the socket is typically `999` or another value set by Docker Desktop. A common default that works is `999`.

Once you have the GID, update your `.env` file:

```dotenv
# Example for a typical Linux system where 'docker' group has GID 999
DOCKER_GID=999
```

## Running the Application with Docker Compose

Once your `.env` file is configured, you can build and run the application using Docker Compose:

```bash
docker-compose up -d --build
```

The application will be available at `http://localhost:3000`.

## Scripts

This is used to execute pre-defined shell commands from the web UI.

The `reboot-server` script uses a secure, one-shot Docker container (`justinribeiro/nsenter-reboot`) to reboot the host machine. This is a safe and isolated way to perform a privileged operation without granting extra permissions to the main application container.

Create a `scripts.json` file in the root of your project:

```json
[
  {
    "id": "reboot-server",
    "title": "Reboot Server",
    "description": "Reboots the entire host machine safely.",
    "command": "sudo /sbin/reboot"
  },
  {
    "id": "docker-cleanup",
    "title": "Docker Cleanup",
    "description": "Remove dangling images and unused containers.",
    "command": "docker system prune -f"
  }
]
```
