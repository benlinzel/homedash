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
    "command": "docker run --rm --privileged --pid=host justincormack/nsenter1 /sbin/reboot"
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

Create a `.env` file in the root of the project by copying the example. You can run `touch .env.example` if it doesn't exist.

Your `.env` file must contain two variables to ensure the container has the correct permissions to interact with the Docker socket and write to the `./data` volume on your host machine.

- **`UID`**: The User ID of your user account on the host. Find this by running `id -u`.
- **`DOCKER_GID`**: The Group ID of the `docker` group on the host. Find this by running `getent group docker | cut -d: -f3`.

Your `.env` file should look like this:

```dotenv
# Example for a user with UID 1000 and a docker group with GID 999
UID=1000
DOCKER_GID=999
```

## Initial Setup

Before running the application for the first time, you must create the data directory on your host and set the correct ownership. This ensures the container has permission to write persistent data (like push notification subscriptions).

From the project's root directory on your host machine, run the following commands:

```bash
# 1. Create the data directory
mkdir -p ./data

# 2. Set the ownership to your current user and group
sudo chown $(id -u):$(id -g) ./data
```

## Running the Application

Once your `.env` file is configured and the data directory is set up, you can build and run the application using Docker Compose:

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
    "command": "docker run --rm --privileged --pid=host justincormack/nsenter1 /sbin/reboot"
  },
  {
    "id": "docker-cleanup",
    "title": "Docker Cleanup",
    "description": "Remove dangling images and unused containers.",
    "command": "docker system prune -f"
  }
]
```

## Running the Application

It is recommended to use Docker Compose to orchestrate the application and any related services (e.g., a Cloudflared container for the tunnel).

The `docker-compose.yml` file is configured to:

- Build the application using the `Dockerfile`.
- Mount the Docker socket so the app can communicate with the daemon.
- Mount a local `./data` directory to `/app/data` for persistent storage (e.g., push subscriptions).
- Mount your `.env` and `scripts.json` files as read-only volumes.
