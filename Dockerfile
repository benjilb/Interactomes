FROM node:20

WORKDIR /app
COPY backend/package*.json ./
#COPY package*.json ./

RUN npm install

COPY backend .
#COPY . .
EXPOSE 3306
CMD ["npm", "run", "dev"]
#CMD ["npm", "start"]