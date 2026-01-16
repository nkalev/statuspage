FROM node:20-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
# We will mount the config via docker-compose or copy it here if context allows.
# For now, let's rely on the volume mount in docker-compose for the config, 
# or copy it if we change the context.
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
