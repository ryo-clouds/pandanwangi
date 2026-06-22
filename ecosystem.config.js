module.exports = {
  apps: [
    {
      name: "pandanwangi-server",
      script: "npm",
      args: "run start",
      cwd: "./server",
      env: {
        NODE_ENV: "production",
      },
    },
    // Jika client (Vite) juga ingin dijalankan via PM2 dengan mode preview, uncomment bagian di bawah ini:
    // {
    //   name: "pandanwangi-client",
    //   script: "npm",
    //   args: "run preview",
    //   cwd: "./client",
    //   env: {
    //     NODE_ENV: "production",
    //   },
    // }
  ],
};
