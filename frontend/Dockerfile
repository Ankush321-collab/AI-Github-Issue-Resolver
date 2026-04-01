FROM node:20-alpine

WORKDIR /app

COPY frontend/package*.json ./
RUN apk add --no-cache python3 make g++
RUN npm install

COPY frontend/ .

ENV NEXT_PUBLIC_GRAPHQL_URL=http://gateway:4000/graphql
ENV NEXT_PUBLIC_GRAPHQL_WS_URL=ws://gateway:4000/graphql

EXPOSE 3000

CMD ["npm", "run", "dev"]
