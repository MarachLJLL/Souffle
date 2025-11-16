import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, existsSync, statSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'serve-root-database',
      configureServer(server) {
        const rootDatabasePath = path.resolve(__dirname, '../../database');
        
        server.middlewares.use('/database', (req, res, next) => {
          // Handle CORS preflight requests
          if (req.method === 'OPTIONS') {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
            res.statusCode = 204;
            res.end();
            return;
          }
          
          // Remove query parameters if any
          const urlPath = req.url.split('?')[0];
          let relativePath = urlPath;
          
          // Remove leading /database from the path
          if (relativePath.startsWith('/database/')) {
            relativePath = relativePath.substring('/database/'.length);
          } else if (relativePath === '/database' || relativePath === '/database/') {
            relativePath = '';
          }
          
          // Skip if path is empty or doesn't match database route
          if (!relativePath && urlPath !== '/database') {
            return next();
          }
          
          const filePath = path.join(rootDatabasePath, relativePath);
          const resolvedPath = path.resolve(filePath);
          const rootPath = path.resolve(rootDatabasePath);
          
          // Security check: ensure we're not accessing files outside the database folder
          if (!resolvedPath.startsWith(rootPath)) {
            res.statusCode = 403;
            res.end('Forbidden');
            return;
          }
          
          // Check if file exists
          if (!existsSync(resolvedPath)) {
            res.statusCode = 404;
            res.end('Not Found');
            return;
          }
          
          // Check if it's a file (not a directory)
          const stats = statSync(resolvedPath);
          if (!stats.isFile()) {
            res.statusCode = 404;
            res.end('Not Found');
            return;
          }
          
          try {
            // Read file content (handles binary files correctly)
            const content = readFileSync(resolvedPath);
            const ext = path.extname(resolvedPath).toLowerCase();
            
            const mimeTypes = {
              '.json': 'application/json',
              '.glb': 'model/gltf-binary',
              '.jpg': 'image/jpeg',
              '.jpeg': 'image/jpeg',
              '.png': 'image/png',
              '.webp': 'image/webp',
            };
            
            // Set appropriate headers
            res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
            res.setHeader('Content-Length', content.length);
            
            // Enable CORS for GLB files
            if (ext === '.glb') {
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
            }
            
            res.end(content);
          } catch (error) {
            console.error('Error serving file:', resolvedPath, error);
            res.statusCode = 500;
            res.end('Internal Server Error');
          }
        });
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    fs: {
      allow: ['..'],
    },
  },
  // Use public directory for static assets
  publicDir: 'public',
});
