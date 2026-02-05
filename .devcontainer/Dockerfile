FROM mcr.microsoft.com/devcontainers/base:ubuntu

# Install Node.js 24
RUN curl -fsSL https://deb.nodesource.com/setup_24.x | bash - \
    && apt-get install -y nodejs

# Install Rust
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

# Install Tauri dependencies for Linux
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
&& apt-get install -y \
build-essential \
libssl-dev \
pkg-config \
pkg-config \
wget \
file \
libwebkit2gtk-4.1-dev \
libgtk-3-dev \
&& apt-get clean -y && rm -rf /var/lib/apt/lists/*

# gui support for tauri
RUN apt-get update && apt-get install -y \
    libgl1-mesa-dri \
    libwayland-client0 \
    libxkbcommon0 \
    mesa-utils \
 && rm -rf /var/lib/apt/lists/*

# Create a non-root user
ARG USERNAME=vscode
ARG USER_UID=1000
ARG USER_GID=$USER_UID

# Install sudo first (if not already installed)
RUN apt-get update && apt-get install -y sudo && rm -rf /var/lib/apt/lists/*

# Create user and configure sudo (skip if already exists)
RUN groupadd --gid $USER_GID $USERNAME 2>/dev/null || true \
&& useradd --uid $USER_UID --gid $USER_GID -m $USERNAME 2>/dev/null || true \
&& echo $USERNAME ALL=\(root\) NOPASSWD:ALL > /etc/sudoers.d/$USERNAME \
&& chmod 0440 /etc/sudoers.d/$USERNAME

USER $USERNAME

# install bun for the vscode user
RUN curl -fsSL https://bun.com/install | bash

# Install Rust for the vscode user
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/home/vscode/.cargo/bin:${PATH}"

RUN cargo install tauri-cli --version "^2.0.0" --locked

WORKDIR /workspace
