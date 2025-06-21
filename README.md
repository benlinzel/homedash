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

## Deployment

It is recommended to use Docker Compose to orchestrate the application and any related services (e.g., a Cloudflared container for the tunnel).

- Mount the Docker socket to the container.
- Mount your `.env` and `scripts.json` files as volumes.
- Use the provided `Dockerfile` and `docker-compose.yml` as a starting point.

### Configuring the Docker Group ID (DOCKER_GID)

To access the Docker socket securely, the user inside the container needs to match the Group ID (GID) of the `docker.sock` file on the host machine. You must set this GID in your `.env` file.

**On Linux (Production):**

1.  Find the GID of the `docker` group by running:

    ```bash
    grep docker /etc/group
    ```

    The output will look like `docker:x:999:`. The number is your GID.

2.  If the `docker` group does not exist, create it first:

    ```bash
    sudo groupadd docker
    sudo chgrp docker /var/run/docker.sock
    # Then run the grep command again to find the GID.
    ```

3.  Create or edit your `.env` file and add the GID:
    ```env
    DOCKER_GID=999 # Replace 999 with your actual GID
    ```

**On macOS (Local Development):**

1.  Find the GID of the `docker.sock` file by running:

    ```bash
    stat -f '%g' /var/run/docker.sock
    ```

    This will likely output `1`.

2.  Create a local `.env` file for development and add the GID:
    ```env
    DOCKER_GID=1
    ```

### Enabling Privileged Scripts (e.g., Reboot)

To safely execute scripts that require root privileges from within the container, you must configure the host machine to grant specific, passwordless `sudo` access. **Never grant broad `sudo` access to the container user.**

Here is the most secure method for enabling the reboot script:

**1. Create a Dedicated Script on the Host**

This script isolates the `reboot` command, ensuring the container can only perform this single action.

```bash
# Create the script file
sudo nano /usr/local/bin/reboot-homedash.sh

# Add the following content
#!/bin/bash
/sbin/reboot

# Make the script executable
sudo chmod +x /usr/local/bin/reboot-homedash.sh
```

**2. Grant Specific `sudo` Permission**

This rule allows the user running the Docker daemon to execute _only_ the script we just created, without a password.

```bash
# Safely create the sudoers rule file
sudo visudo -f /etc/sudoers.d/homedash-reboot
```

Add the following line to the file, replacing `<your_docker_user>` with the username that runs your containers (e.g., `ubuntu`):

```
<your_docker_user> ALL=(ALL) NOPASSWD: /usr/local/bin/reboot-homedash.sh
```

**3. Confirm Your Configuration**

- The `docker-compose.yml` file maps the host script `reboot-homedash.sh` to `/app/scripts/reboot.sh` inside the container.
- Your `scripts.json` file should have a command like `"command": "sudo /app/scripts/reboot.sh"` to execute the script.
