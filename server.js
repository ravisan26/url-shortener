// server.js
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Simple file-based storage (for personal use)
const DB_FILE = 'urls.json';

// Initialize database
function initDB() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({}));
  }
}

function readDB() {
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

initDB();

// Generate random short code
function generateCode() {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// API Routes

// Get all URLs
app.get('/api/urls', (req, res) => {
  const urls = readDB();
  res.json(urls);
});

// Create short URL
app.post('/api/shorten', (req, res) => {
  const { url, customCode } = req.body;

  if (!url || !url.match(/^https?:\/\/.+/)) {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  const urls = readDB();
  let code = customCode || generateCode();

  // Check if custom code already exists
  if (urls[code]) {
    return res.status(409).json({ error: 'Code already exists' });
  }

  // Ensure generated code is unique
  while (!customCode && urls[code]) {
    code = generateCode();
  }

  urls[code] = {
    url,
    created: new Date().toISOString(),
    clicks: 0
  };

  writeDB(urls);
  res.json({ code, shortUrl: `${req.protocol}://${req.get('host')}/${code}` });
});

// Delete URL
app.delete('/api/urls/:code', (req, res) => {
  const { code } = req.params;
  const urls = readDB();

  if (!urls[code]) {
    return res.status(404).json({ error: 'URL not found' });
  }

  delete urls[code];
  writeDB(urls);
  res.json({ success: true });
});

// Redirect route (must be last)
app.get('/:code', (req, res) => {
  const { code } = req.params;
  const urls = readDB();

  if (!urls[code]) {
    return res.status(404).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>404 - Link Not Found</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          .container {
            background: white;
            padding: 3rem;
            border-radius: 1rem;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            text-align: center;
          }
          h1 { color: #667eea; margin: 0 0 1rem 0; }
          p { color: #666; }
          a { color: #667eea; text-decoration: none; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>404 - Link Not Found</h1>
          <p>This short link doesn't exist or has been deleted.</p>
          <a href="/">← Go to homepage</a>
        </div>
      </body>
      </html>
    `);
  }

  // Increment click counter
  urls[code].clicks = (urls[code].clicks || 0) + 1;
  writeDB(urls);

  // Redirect to original URL
  res.redirect(urls[code].url);
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
