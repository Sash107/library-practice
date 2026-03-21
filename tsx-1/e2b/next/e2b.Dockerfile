FROM node:21-slim

RUN apt-get update && apt-get install -y curl && apt-get clean && rm -rf /var/lib/apt/lists/*

COPY compile_page.sh /compile_page.sh
RUN chmod +x compile_page.sh

WORKDIR /home/user/nextjs-app

RUN npx create-next-app@latest . --yes

RUN npx --yes shadcn@2.6.3 init --yes -b neutral --force
RUN npx --yes shadcn@2.6.3 add --all --yes
RUN npm install tw-animate-css tailwindcss-animate

RUN mv /home/user/nextjs-app/* /home/user/ && mv /home/user/nextjs-app/.* /home/user/ 2>/dev/null || true && rm -rf /home/user/nextjs-app