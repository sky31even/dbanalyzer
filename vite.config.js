import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import http from 'http'
import https from 'https'
import { URL } from 'url'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'image-proxy',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (!req.url.startsWith('/api/proxy/image')) {
            return next();
          }

          try {
            const urlObj = new URL(req.url, `http://${req.headers.host}`);
            const targetUrl = urlObj.searchParams.get('url');
            
            if (!targetUrl) {
              res.statusCode = 400;
              res.end('Missing url parameter');
              return;
            }

            // Determine protocol
            const client = targetUrl.startsWith('https') ? https : http;
            
            const proxyReq = client.request(targetUrl, {
              headers: {
                'Referer': 'https://www.douban.com',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
              }
            }, (proxyRes) => {
              res.writeHead(proxyRes.statusCode, proxyRes.headers);
              proxyRes.pipe(res);
            });
            
            proxyReq.on('error', (err) => {
              console.error('Proxy error:', err);
              res.statusCode = 500;
              res.end('Proxy error');
            });
            
            proxyReq.end();
          } catch (e) {
            console.error('Proxy middleware error:', e);
            next();
          }
        });
      }
    }
  ],
  server: {
    proxy: {
      '/api/movie': {
        target: 'https://movie.douban.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/movie/, ''),
        headers: {
          'Referer': 'https://movie.douban.com',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      },
      '/api/book': {
        target: 'https://book.douban.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/book/, ''),
        headers: {
          'Referer': 'https://book.douban.com',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      },
      '/api/music': {
        target: 'https://music.douban.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/music/, ''),
        headers: {
          'Referer': 'https://music.douban.com',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      }
    }
  }
})
