# ---- build stage ----
FROM node:22-alpine AS build
WORKDIR /app

# Copy package files first to leverage Docker cache
COPY package*.json ./

# install dependencies — allow legacy peer deps to avoid peer-dep resolution failures in CI
# also do --silent to reduce log noise
RUN npm ci --no-audit --no-fund --legacy-peer-deps --silent

# Copy rest of the app
COPY . .

# Build the app (adjust output path if your project outputs to /build)
RUN npm run build

# ---- serve stage ----
FROM nginx:stable-alpine

# Optional: copy a custom nginx config if you have one
# COPY nginx.conf /etc/nginx/conf.d/default.conf

# If Vite output is /dist, copy it; change if your build produces /build
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
