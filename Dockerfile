FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npx prisma generate
RUN npm run build

# Production image
FROM node:22-alpine AS production
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./
COPY --from=build /app/prisma ./prisma
RUN npm install --only=production --legacy-peer-deps
RUN npx prisma generate
RUN npx prisma migrate deploy
EXPOSE 3001
CMD ["node", "dist/main.js"]
