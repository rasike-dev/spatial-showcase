// Simple production server using Node.js built-in modules
// No external dependencies required
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, extname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = 8081;
const DIST_DIR = join(__dirname, 'dist');

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const server = createServer((req, res) => {
  let pathname = new URL(req.url, `http://${req.headers.host}`).pathname;
  
  // Remove query string and hash for file serving
  pathname = pathname.split('?')[0].split('#')[0];
  
  // Default to index.html for root or non-file paths
  if (pathname === '/' || !extname(pathname)) {
    pathname = '/index.html';
  }
  
  const filePath = join(DIST_DIR, pathname);
  
  if (existsSync(filePath)) {
    const ext = extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    
    try {
      const content = readFileSync(filePath);
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    } catch (error) {
      res.writeHead(500);
      res.end('Error reading file');
    }
  } else {
    // For any route, serve index.html (client-side routing)
    const indexPath = join(DIST_DIR, 'index.html');
    if (existsSync(indexPath)) {
      const content = readFileSync(indexPath);
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(content);
    } else {
      res.writeHead(404);
      res.end('File not found');
    }
  }
});

server.listen(PORT, () => {
  console.log(`🚀 Production server running on http://localhost:${PORT}`);
  console.log(`📝 Serving files from: ${DIST_DIR}`);
  console.log(`🔗 All routes serve index.html (client-side routing)`);
  console.log(`\n📋 Test share links:`);
  console.log(`   - Hash: http://localhost:${PORT}/#token=YOUR_TOKEN`);
  console.log(`   - Query: http://localhost:${PORT}/?token=YOUR_TOKEN`);
  console.log(`   - Path: http://localhost:${PORT}/view/YOUR_TOKEN`);
});

