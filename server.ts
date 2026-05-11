import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Proxy GitHub API
  app.all("/api/github/*", async (req, res) => {
    // Prefer client-provided token if available, fallback to server secret
    const clientToken = req.headers['x-github-token'];
    const githubToken = clientToken || process.env.GITHUB_TOKEN;

    if (!githubToken) {
      return res.status(500).json({ error: "GITHUB_TOKEN not configured on server and no token provided by client" });
    }

    const path = req.params[0];
    const url = `https://api.github.com/${path}${req.url.includes('?') ? '?' + req.url.split('?')[1] : ''}`;

    try {
      const response = await fetch(url, {
        method: req.method,
        headers: {
          "Authorization": `Bearer ${githubToken}`,
          "Accept": "application/vnd.github.v3+json",
          "Content-Type": "application/json",
          "User-Agent": "RepoScripter-App"
        },
        body: ["GET", "HEAD"].includes(req.method) ? undefined : JSON.stringify(req.body)
      });

      const data = await response.json();
      res.status(response.status).json(data);
    } catch (error) {
      console.error("GitHub Proxy Error:", error);
      res.status(500).json({ error: "Failed to proxy request to GitHub" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
