FROM node:alpine

COPY package.json package-lock.json ./
RUN npm ci
COPY ./ ./
RUN npm run build
EXPOSE 3333
CMD [ "node","dist/main.js" ]
