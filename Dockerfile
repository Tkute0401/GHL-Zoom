FROM node:18-alpine

# Create app directory
WORKDIR /app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./

RUN npm ci --only=production

# Bundle app source
COPY . .

# Expose the port the app runs on
EXPOSE 3000

# Define environment variables (can be overridden at runtime)
# ENV NODE_ENV=production

# Start the application
CMD [ "npm", "start" ]
