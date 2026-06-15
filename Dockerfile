# 1) Build the static bundle
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
# --ignore-scripts skips the husky "prepare" hook (no .git in the build context)
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build

# 2) Tiny Node + Express server for the static files
FROM node:22-alpine AS serve
WORKDIR /app
ENV NODE_ENV=production PORT=80
COPY server.cjs ./
# Express is the only runtime dependency. It's installed here (not in the app's package.json) so the
# build lockfile stays untouched
RUN npm init -y >/dev/null 2>&1 && npm install --omit=dev express@^4.21.2 && npm cache clean --force
COPY --from=build /app/dist ./dist
EXPOSE 80
CMD ["node", "server.cjs"]
