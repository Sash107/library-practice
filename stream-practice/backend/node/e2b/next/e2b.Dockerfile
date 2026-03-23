FROM node:21-slim

RUN apt-get update && apt-get install -y curl git && rm -rf /var/lib/apt/lists/*

WORKDIR /home/user

RUN npx create-next-app@latest myapp \
    --typescript \
    --tailwind \
    --eslint \
    --app \
    --no-git \
    --yes

WORKDIR /home/user/myapp

RUN npx --yes shadcn@2.6.3 init --yes -b neutral --force
RUN npx --yes shadcn@2.6.3 add --all --yes

RUN npm install tw-animate-css tailwind-merge clsx

RUN npm install

COPY start.sh /home/user/start.sh
RUN chmod +x /home/user/start.sh
