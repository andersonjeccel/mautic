#!/bin/bash
set -e

echo "🔄 Stopping and removing DDEV containers..."
ddev stop --unlist mautic || true

# Stop all running containers
echo "🛑 Stopping all running Docker containers..."
docker stop $(docker ps -q) 2>/dev/null || true

echo "🧹 Removing DDEV project data..."
ddev delete -y mautic --omit-snapshot || true

echo "🧹 Running ddev clean to remove all DDEV resources..."
ddev clean --all || y

echo "🔌 Powering off DDEV..."
ddev poweroff || true

# Remove DDEV-specific Docker resources
echo "🧹 Removing DDEV Docker containers..."
docker rm -f $(docker ps -a | awk '/ddev/ { print $1 }') 2>/dev/null || true

echo "🧹 Removing DDEV Docker images..."
docker rmi -f $(docker images | awk '/ddev/ {print $3}') 2>/dev/null || true

echo "🧹 Removing DDEV volumes..."
docker volume rm $(docker volume ls | awk '/ddev|-mariadb/ { print $2 }') 2>/dev/null || true

# General Docker cleanup
echo "🧽 Cleaning up Docker resources..."
docker system prune -a -f --volumes
docker network prune -f
docker image prune -a -f

# Clean up global DDEV directories
echo "🗑️  Removing DDEV global directories..."
rm -rf ~/.ddev ~/.ddev_mutagen_data_directory 2>/dev/null || true

# Clean up project-specific files
echo "🗑️  Removing project temporary files and caches..."
rm -rf .phpunit.cache var/cache/* var/logs/* var/sessions/*

# Remove any remaining DDEV host entries
echo "🔧 Cleaning up host file entries..."
ddev hostname --remove-inactive 2>/dev/null || true

# Verify cleanup
echo "\n🔍 Verification:"
echo "📦 Docker containers:" && docker ps -a
echo -e "\n🌐 Docker networks:" && docker network ls
echo -e "\n💾 Docker volumes:" && docker volume ls
echo -e "\n🏠 DDEV projects:" && ddev list

echo -e "\n✅ Cleanup complete! You can now run 'ddev start' to start fresh."
