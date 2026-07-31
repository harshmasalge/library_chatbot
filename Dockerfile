# Use an official Python lightweight image
FROM python:3.11-slim

# Set environment variables to ensure Python output is logged properly
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set the working directory
WORKDIR /app

# Copy only requirements first to leverage Docker layer caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Run the indexing script during the Docker build process.
# This downloads the SentenceTransformer model and generates the FAISS index
# so that the container is ready to serve traffic immediately upon starting.
RUN python -m scripts.index_data --input EJournals_database.xlsx --force

# Expose the port that FastAPI runs on
EXPOSE 8000

# Command to start the Uvicorn server
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
