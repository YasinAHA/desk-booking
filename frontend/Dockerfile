FROM node:20-alpine AS build
WORKDIR /app

# ✅ build-time env for Vite
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

COPY package*.json ./
COPY frontend/package*.json ./frontend/
RUN npm ci -w frontend

COPY frontend ./frontend
RUN npm -w frontend run build

FROM nginx:1.27-alpine AS runtime
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist /usr/share/nginx/html

EXPOSE 80
