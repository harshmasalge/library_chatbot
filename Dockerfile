# Use an official Python lightweight image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set the working directory
WORKDIR /app

# Install curl (needed by entrypoint.sh to download data files)
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Copy only requirements first to leverage Docker layer caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Make the entrypoint script executable
RUN chmod +x scripts/entrypoint.sh

# Expose the port that FastAPI runs on
EXPOSE 8000

# Use entrypoint script — it downloads data if needed, then starts the server
ENTRYPOINT ["scripts/entrypoint.sh"]
