# Use Node.js LTS as the base (this is the PRIMARY runtime)
FROM node:20-slim

# Install Python for lead generation scripts
RUN apt-get update && apt-get install -y python3 python3-pip python3-venv --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy Python requirements first (for caching)
COPY requirements.txt ./
RUN pip3 install --break-system-packages -r requirements.txt

# Copy root package.json and install root deps
COPY package.json ./
RUN npm install

# Copy CRM package files and install CRM deps
COPY crm/package.json crm/package-lock.json* crm/
RUN cd crm && npm install --omit=dev

# Copy everything else
COPY . .

# Railway provides PORT automatically
EXPOSE ${PORT:-3001}

CMD ["node", "crm/server.mjs"]
