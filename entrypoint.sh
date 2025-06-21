#!/bin/sh
#
# This script is the entrypoint for the Docker container.
# Its purpose is to fix potential permission issues with mounted volumes
# and then execute the main command.

set -e

# Take ownership of the /app/data directory.
# This ensures that the 'nextjs' user can write to it, even if the
# volume was mounted with different ownership from the host.
chown -R nextjs:docker /app/data

# Execute the command passed to this script (e.g., `node server.js`)
exec "$@" 