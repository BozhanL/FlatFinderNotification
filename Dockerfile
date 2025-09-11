FROM node:22-bookworm

WORKDIR /app

COPY ./ ./

RUN npm ci

CMD ["npm", "start"]