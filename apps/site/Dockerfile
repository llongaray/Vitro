FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY apps/site/package.json apps/site/package.json
COPY apps/dashboard/package.json apps/dashboard/package.json
COPY packages/ui/package.json packages/ui/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY packages/ui packages/ui
COPY apps/site apps/site
ARG REVALIDATE_SECRET=dev-only-change-me-revalidate
ENV REVALIDATE_SECRET=$REVALIDATE_SECRET
ENV API_INTERNAL_URL=http://api:8000
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @vitrio/site build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV API_INTERNAL_URL=http://api:8000
COPY --from=build /app/apps/site/.next/standalone ./
COPY --from=build /app/apps/site/.next/static ./apps/site/.next/static
COPY --from=build /app/apps/site/public ./apps/site/public
EXPOSE 3000
CMD ["node", "apps/site/server.js"]
