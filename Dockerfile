FROM node:22-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src ./src
COPY public ./public
COPY sql ./sql
COPY scripts ./scripts
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "src/server.js"]
