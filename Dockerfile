FROM node:20

COPY package.json package-lock.json ./
RUN npm ci
COPY ./ ./
RUN npm run build
EXPOSE 3333
CMD [ "npm","start" ]
