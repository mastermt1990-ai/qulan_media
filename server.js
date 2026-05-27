const http = require("http");
const handler = require("serve-handler");
const path = require("path");

const port = Number(process.env.PORT) || 3000;
const publicDir = __dirname;

const server = http.createServer((req, res) =>
  handler(req, res, {
    public: publicDir,
    cleanUrls: false,
    directoryListing: false,
    rewrites: [{ source: "/", destination: "/index.html" }],
    ignores: [
      "node_modules/**",
      ".git/**",
      ".github/**",
      "server.js",
      "package.json",
      "package-lock.json",
      "railway.toml",
      "nixpacks.toml",
      "Procfile",
      "README.md",
      ".gitignore",
    ],
  })
);

server.listen(port, "0.0.0.0", () => {
  console.log(`QULAN MEDIA running on port ${port}`);
});
