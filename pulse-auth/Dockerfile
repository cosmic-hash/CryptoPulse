# 1. Base image
FROM python:3.10-slim

# 2. Set working directory
WORKDIR /app

# 3. Install system dependencies (needed for some Python packages)
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       gcc \
       libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# 4. Copy and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 5. Copy application code
COPY . .

# 7. Expose the port your app runs on
EXPOSE 8080

CMD ["python", "app.py"]
