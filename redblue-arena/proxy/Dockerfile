FROM node:22-slim

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY proxy.js ./

ENV PORT=4000
EXPOSE 4000

CMD ["node", "proxy.js"]
