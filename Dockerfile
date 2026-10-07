FROM node:22-alpine AS builder

WORKDIR /app

# `npm ci` requires package-lock.json to match package.json exactly — run `npm install`
# locally and commit the lockfile after changing dependencies.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN npm run build

FROM node:22-alpine AS runner

WORKDIR /app

# Runtime config (NUXT_PUBLIC_*) is read from process.env when the Nitro server starts,
# but is baked in here via build args, sourced from Bitbucket repository/deployment
# variables. Rotating any of these values requires a rebuild + redeploy, not just a
# config change — same tradeoff as vibe-talenta-core / vibe-mekari-sign.
ARG NUXT_PUBLIC_AUTH0_DOMAIN
ARG NUXT_PUBLIC_AUTH0_CLIENT_ID

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
ENV NUXT_PUBLIC_AUTH0_DOMAIN=$NUXT_PUBLIC_AUTH0_DOMAIN
ENV NUXT_PUBLIC_AUTH0_CLIENT_ID=$NUXT_PUBLIC_AUTH0_CLIENT_ID

COPY --from=builder /app/.output ./.output

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
