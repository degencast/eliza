# Use a specific Node.js version for better reproducibility
FROM node:23.3.0-slim AS builder

# Install pnpm globally and install necessary build tools
RUN npm install -g pnpm@9.4.0 && \
    apt-get update && \
    apt-get install -y openssh-client git python3 make g++ && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Set Python 3 as the default python
RUN ln -s /usr/bin/python3 /usr/bin/python

# 创建 .ssh 目录并设置适当的权限
RUN mkdir -p /root/.ssh
# 复制本地的 SSH 私钥到 Docker 镜像中（确保你已经将私钥存放在合适的位置）
COPY ~/.ssh/id_rsa /root/.ssh/id_rsa
# 设置权限，确保私钥仅对 root 用户可读
RUN chmod 600 /root/.ssh/id_rsa
# 添加 GitHub 的 SSH 公钥到 known_hosts，避免首次连接时的验证错误
RUN ssh-keyscan github.com >> /root/.ssh/known_hosts
# 配置 SSH，禁用 strict host key checking（可选）
RUN echo "Host github.com\n  StrictHostKeyChecking no\n  UserKnownHostsFile=/dev/null" >> /root/.ssh/config

# Set the working directory
WORKDIR /app

# Copy package.json and other configuration files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc turbo.json ./

# Copy the rest of the application code
COPY agent ./agent
COPY packages ./packages
COPY scripts ./scripts
COPY characters ./characters

# Install dependencies and build the project
RUN pnpm install \
    && pnpm build-docker \
    && pnpm prune --prod

# Create a new stage for the final image
FROM node:23.3.0-slim

# Install runtime dependencies if needed
RUN npm install -g pnpm@9.4.0 && \
    apt-get update && \
    apt-get install -y git python3 && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy built artifacts and production dependencies from the builder stage
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/.npmrc ./
COPY --from=builder /app/turbo.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/agent ./agent
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/characters ./characters

# Set the command to run the application
CMD ["pnpm", "start", "--character='characters/degencastAI.character.json'"]
