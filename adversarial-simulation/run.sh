#!/bin/bash

# Script to run the 1v1 Adversarial Simulation Game

# Set script to exit on error
set -e

echo "===== 1v1 Adversarial Simulation Game ====="
echo "This script will set up and run the simulation environment"

# Ensure Docker and Docker Compose are installed
if ! [ -x "$(command -v docker)" ]; then
  echo "Error: docker is not installed." >&2
  exit 1
fi

if ! [ -x "$(command -v docker-compose)" ]; then
  echo "Error: docker-compose is not installed." >&2
  exit 1
fi

# Set environment variables for Docker Compose
export C2_API_KEY="secret_red_team_key_$(date +%s)"
export MONITORING_API_KEY="secret_blue_team_key_$(date +%s)"

echo "Setting up environment..."
echo "C2 API Key: $C2_API_KEY"
echo "Monitoring API Key: $MONITORING_API_KEY"

# Build and start the containers
echo "Building and starting containers (this may take a few minutes)..."
docker-compose up -d --build

# Wait for services to be ready
echo "Waiting for services to start..."
sleep 10

# Display access information
echo ""
echo "===== Access Information ====="
echo "Red Team C2 Server: http://localhost:3000"
echo "Blue Team Dashboard: http://localhost:3002"
echo "Kibana (Logs & Analytics): http://localhost:5601"
echo ""
echo "To stop the simulation: docker-compose down"
echo ""
echo "The simulation is now running!"

# Check if all containers are up
docker-compose ps
