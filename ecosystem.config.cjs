module.exports = {
  apps: [
    {
      name: 'storno-mcp',
      script: '/root/.nvm/versions/node/v22.17.0/bin/storno-cli',
      pre_start: 'npm install -g storno-cli@latest',
      env: {
        STORNO_HTTP_PORT: 3100,
        STORNO_HTTP_HOST: '127.0.0.1',
        STORNO_OAUTH_BASE_URL: 'https://app.storno.ro',
        STORNO_OAUTH_CLIENT_ID: 'storno_cid_1bd83d780a2842b19f239f58e2decb6d',
      },
    },
  ],
};
