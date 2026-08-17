# Frontend Dockerfile for SehatSetu (Vite + React 19 + TypeScript)
FROM node:22-alpine

WORKDIR /app

# Copy package manifests and install dependencies
COPY package*.json ./
RUN npm ci

# Copy frontend source code
COPY . .

# Expose Vite dev server port
EXPOSE 5173

# Start development server binding to all network interfaces
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
