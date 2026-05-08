#!/bin/sh

# This script is the entrypoint for the Docker container.
# It executes the command passed to the container (e.g., "python main.py").
exec "$@"
