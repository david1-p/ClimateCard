#!/bin/bash

# Load environment variables from parent directory .env file
if [ -f "../.env" ]; then
    echo "Loading environment variables from .env file..."
    export $(cat ../.env | grep -v '^#' | xargs)
fi

# Start Spring Boot application
echo "Starting Spring Boot application..."
./gradlew bootRun
