module.exports = {
  apps: [
    {
      name: "directbuy-web",
      script: "npx",
      args: "next start -p 3001",
      cwd: "/var/www/directbuy/current",
      interpreter: "none",
      env: {
        NODE_ENV: "production",
        PORT: 3001
      }
    },
    {
      name: "directbuy-bot",
      script: "npx",
      args: "tsx bot/start.ts",
      cwd: "/var/www/directbuy/current",
      interpreter: "none",
      max_restarts: 50,
      restart_delay: 5000,
      env: {
        NODE_ENV: "production"
      }
    },
    {
      name: "directbuy-worker",
      script: "npx",
      args: "tsx lib/queue/worker.ts",
      cwd: "/var/www/directbuy/current",
      interpreter: "none",
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};
