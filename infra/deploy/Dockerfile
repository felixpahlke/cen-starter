FROM node:24-slim AS build

WORKDIR /app
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV LEFTHOOK=0

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY app/backend/package.json backend/package.json
COPY app/frontend/package.json frontend/package.json
COPY app/shared/package.json shared/package.json

RUN pnpm install --frozen-lockfile

COPY tsconfig.base.json tsconfig.base.json
COPY app/backend backend
COPY app/frontend frontend
COPY app/shared shared

RUN pnpm build
# Legacy deploy keeps this workspace compatible without changing pnpm-workspace.yaml.
RUN pnpm deploy --filter @cen/backend --prod --legacy /app/backend-prod
# Keep migration SQL available without shipping Drizzle tooling or app source.
RUN rm -rf /app/backend-prod/src /app/backend-prod/drizzle.config.ts /app/backend-prod/tsconfig.json \
  && mkdir -p /app/backend-prod/src/db \
  && cp -R /app/backend/src/db/migrations /app/backend-prod/src/db/migrations

FROM node:24-slim AS runtime

ENV NODE_ENV=production
ENV PORT=8080

WORKDIR /app

COPY --from=build --chown=node:node /app/backend-prod ./
COPY --from=build --chown=node:node /app/backend/dist ./dist
COPY --from=build --chown=node:node /app/frontend/dist ./static

USER node

EXPOSE 8080
CMD ["node", "dist/index.js"]
