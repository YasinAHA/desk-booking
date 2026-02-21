FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
COPY frontend/package*.json ./frontend/
RUN npm ci -w frontend

COPY frontend ./frontend
RUN npm -w frontend run build

FROM nginx:1.27-alpine AS runtime
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist /usr/share/nginx/html

EXPOSE 80
