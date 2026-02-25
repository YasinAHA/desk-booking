FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
COPY backend/package*.json ./backend/
RUN npm ci -w backend

COPY backend ./backend
RUN npm -w backend run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
COPY backend/package*.json ./backend/
RUN npm ci -w backend --omit=dev

COPY --from=build /app/backend/dist ./backend/dist

EXPOSE 3001
CMD ["node", "backend/dist/server.js"]
