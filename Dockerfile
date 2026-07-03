FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

# Убедись, что папка data существует внутри контейнера
RUN mkdir -p /app/data

EXPOSE 3000

CMD ["npm", "run", "start"]
