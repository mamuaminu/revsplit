FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist

EXPOSE 3000
ENV PORT=3000

CMD ["node", "dist/app.js"]
