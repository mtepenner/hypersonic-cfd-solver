FROM node:20-alpine AS build
WORKDIR /app

ARG VITE_SIM_API_URL=http://localhost:8000
ENV VITE_SIM_API_URL=${VITE_SIM_API_URL}

COPY package.json tsconfig.json vite.config.ts ./
COPY index.html ./
COPY src ./src

RUN npm install
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
