FROM node:20-alpine

WORKDIR /app

COPY frontend/package*.json ./
RUN apk add --no-cache python3 make g++
RUN npm install

COPY frontend/ .



EXPOSE 3000

CMD ["npm", "run", "dev"]
