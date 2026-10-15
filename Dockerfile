# JUM Football — full-stack preview (static export + in-process API server)
FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production PORT=3000
COPY package.json package-lock.json* ./
RUN npm install --omit=dev --no-audit --no-fund || true
COPY . .
EXPOSE 3000
CMD ["node", "scripts/dev-server.mjs"]
