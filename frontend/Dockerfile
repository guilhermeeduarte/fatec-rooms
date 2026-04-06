# ── Stage 1: build React ──────────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci --silent

COPY . .
RUN npm run build

# ── Stage 2: Nginx ────────────────────────────────────────────────────────────
FROM nginx:1.25-alpine
COPY --from=build /app/dist /usr/share/nginx/html

# Configuração Nginx: redireciona qualquer rota ao index.html (SPA)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
