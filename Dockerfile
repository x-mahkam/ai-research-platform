# Build stage: compile frontend (Vite) and bundle backend (esbuild)
FROM node:22-slim AS build
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

# Runtime stage: only production dependencies + built artifacts
FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package.json ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist
COPY storage ./storage
EXPOSE 3000
CMD ["node", "dist/server.cjs"]
