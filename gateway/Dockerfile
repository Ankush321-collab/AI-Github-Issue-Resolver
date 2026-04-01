FROM node:20-alpine

WORKDIR /app

COPY gateway/package*.json ./
RUN apk add --no-cache python3 make g++
RUN npm install

COPY gateway/ .

EXPOSE 4000

CMD ["npm", "run", "dev"]
