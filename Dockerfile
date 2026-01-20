# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies for PDF processing
RUN apk add --no-cache poppler-utils

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:22-alpine AS production

WORKDIR /app

# Install poppler-utils for PDF processing
RUN apk add --no-cache poppler-utils

# Copy built application
COPY --from=builder /app/build ./build
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

# Create uploads directory
RUN mkdir -p /app/uploads && chmod 777 /app/uploads

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
# Set body size limit to 30MB for file uploads
ENV BODY_SIZE_LIMIT=31457280

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "build"]
