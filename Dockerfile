FROM node:erbium-buster-slim AS runtime

RUN echo 'APT::Acquire::Retries "3";' > /etc/apt/apt.conf.d/80-retries \
 && apt-get update \
 && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
 && rm -rf /var/lib/apt/lists/*

FROM runtime AS testing

RUN apt-get update \
 && apt-get install -y --no-install-recommends \
   git

# Receive the APP_PATH argument:
ARG APP_PATH=/icalia-actions/deploy-aws-ecs-service

# Add the project's executable path to the system PATH:
ENV PATH=${APP_PATH}/bin:$PATH

# Configure the app dir as the working dir:
WORKDIR ${APP_PATH}

# Switch to the developer user:
USER node

# Copy and install the project dependency lists into the container image:
# COPY package.json yarn.lock ${APP_PATH}/
# RUN yarn install

FROM testing AS development

# Switch to "root" user to install system dependencies such as sudo:
USER root

# Install sudo, along with other system dependencies required at development
# time:
RUN apt-get install -y --no-install-recommends \
  # Adding bash autocompletion as git without autocomplete is a pain...
  bash-completion \
  # gpg & gpgconf is used to get Git Commit GPG Signatures working inside the 
  # VSCode devcontainer:
  gpg \
  # OpenSSH Client required to push changes to Github via SSH:
  openssh-client \
  # /proc file system utilities: (watch, ps):
  procps \
  # Vim might be used to edit files when inside the container (git, etc):
  vim \
  # Sudo will be used to install/configure system stuff if needed during dev:
  sudo

# Add the developer user to the sudoers list:
RUN echo "node ALL=(ALL) NOPASSWD:ALL" | tee "/etc/sudoers.d/node"

# Persist bash history between runs
# - See https://code.visualstudio.com/docs/remote/containers-advanced#_persist-bash-history-between-runs
RUN SNIPPET="export PROMPT_COMMAND='history -a' && export HISTFILE=/command-history/.bash_history" \
    && mkdir /command-history \
    && touch /command-history/.bash_history \
    && chown -R node /command-history \
    && echo $SNIPPET >> "/home/node/.bashrc"

# Switch to the developer user:
USER node

# Create the directories used to save Visual Studio Code extensions inside the
# dev container:
RUN mkdir -p ~/.vscode-server/extensions ~/.vscode-server-insiders/extensions