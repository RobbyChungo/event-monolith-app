FROM node:18-alpine
WORKDIR /usr/src/app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --production

# Copy source
COPY . .

# Build
RUN npm run build

EXPOSE 3000
CMD [ "node", "dist/index.js" ]
