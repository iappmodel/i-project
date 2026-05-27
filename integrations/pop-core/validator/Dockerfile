FROM node:20-alpine

WORKDIR /app

# Copy local file deps first for npm install cache.
COPY validator/package.json validator/package-lock.json ./
COPY backend ../backend

RUN npm ci

COPY validator/src ./src

ENV POP_VALIDATOR_PORT=8787
ENV POP_VALIDATOR_DATA_DIR=/app/data/validator

EXPOSE 8787

CMD ["npm", "run", "start"]
