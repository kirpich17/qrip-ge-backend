FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build || echo "No build step, continuing..."


FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4040

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src

EXPOSE 4040

CMD ["npm", "run", "start"]
