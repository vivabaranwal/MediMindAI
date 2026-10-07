FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/next.config.mjs ./

# Runtime settings for the API proxy (see lib/server/backendProxy.ts): BACKEND_INTERNAL_URL, FRONTEND_ORIGIN.
USER node
EXPOSE 3000
CMD ["npm", "start"]
