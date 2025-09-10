# ---- build stage ----
FROM node:22-alpine AS build
WORKDIR /app

# Copy package files first to leverage Docker cache
COPY package*.json ./

# install dependencies
RUN npm ci --no-audit --no-fund

# Copy rest of the app
COPY . .

# Build the app (Vite default output is /dist; adjust if your app builds to /build)
RUN npm run build

# ---- serve stage ----
FROM nginx:alpine

# optional: copy a custom nginx config (if you have one)
# COPY nginx.conf /etc/nginx/conf.d/default.conf

# If Vite output is in /dist (default), copy to nginx html folder; otherwise change path
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
