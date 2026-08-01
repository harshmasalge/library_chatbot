#!/bin/bash
set -e

DATA_DIR="/app/data"
RELEASE_BASE_URL="${DATA_RELEASE_URL}"

# Check if data files already exist (e.g., mounted via volume or already downloaded)
if [ -f "$DATA_DIR/ejournal.db" ] && [ -f "$DATA_DIR/embeddings.faiss" ] && [ -f "$DATA_DIR/index_to_journal.pkl" ]; then
    echo "✅ Data files already present. Skipping download."
else
    echo "📥 Data files not found. Downloading from GitHub Release..."

    if [ -z "$RELEASE_BASE_URL" ]; then
        echo "❌ ERROR: DATA_RELEASE_URL environment variable is not set."
        echo "   Please set it to the base URL of your GitHub Release assets."
        echo "   Example: https://github.com/harshmasalge/library_chatbot/releases/download/v1.0.0"
        exit 1
    fi

    mkdir -p "$DATA_DIR"

    echo "  → Downloading ejournal.db..."
    curl -L -o "$DATA_DIR/ejournal.db" "$RELEASE_BASE_URL/ejournal.db"

    echo "  → Downloading embeddings.faiss..."
    curl -L -o "$DATA_DIR/embeddings.faiss" "$RELEASE_BASE_URL/embeddings.faiss"

    echo "  → Downloading index_to_journal.pkl..."
    curl -L -o "$DATA_DIR/index_to_journal.pkl" "$RELEASE_BASE_URL/index_to_journal.pkl"

    echo "✅ Data files downloaded successfully."
fi

echo "🚀 Starting FastAPI server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
