# syntax=docker/dockerfile:1.4
# SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
# SPDX-License-Identifier: Apache-2.0

FROM node:22-alpine AS builder

WORKDIR /app
COPY package*.json ./
COPY nemoclaw/package*.json ./nemoclaw/
RUN npm ci

COPY . .
RUN npm run build:cli

FROM node:22-alpine AS runtime

# Create non-root user and group
RUN addgroup -S nemo && adduser -S nemo -G nemo

WORKDIR /app
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/nemoclaw/package*.json ./nemoclaw/
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/nemoclaw/dist ./nemoclaw/dist
COPY --from=builder /app/bin ./bin

# Set ownership
RUN chown -R nemo:nemo /app

# Switch to non-root user
USER nemo

EXPOSE 3000

ENTRYPOINT ["node", "bin/nemoclaw.js"]
