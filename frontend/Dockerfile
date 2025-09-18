# --- build stage
FROM node:20 AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- serve stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
# SPA fallback pour le router:
RUN sed -i 's/try_files \$uri \$uri\/ =404;/try_files \$uri \$uri\/ \/index.html;/' /etc/nginx/conf.d/default.conf
EXPOSE 80
