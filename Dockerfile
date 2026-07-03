FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

COPY . .

# Убедись, что папка data существует внутри контейнера
RUN mkdir -p /app/data

EXPOSE 3000

CMD ["npm", "run", "start"]
