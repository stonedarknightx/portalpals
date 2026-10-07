import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig, Plugin} from 'vite';

function assetUploadPlugin() {
  return {
    name: 'asset-upload-plugin',
    configureServer(server) {
      server.middlewares.use('/api/upload-asset', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          return res.end('Method Not Allowed');
        }

        let body = '';
        req.on('data', chunk => {
          body += chunk;
        });

        req.on('end', () => {
          try {
            const { filename, dataUrl } = JSON.parse(body);
            if (!filename || !dataUrl) {
              res.statusCode = 400;
              return res.end(JSON.stringify({ error: 'Missing filename or dataUrl' }));
            }

            const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');

            const targets = [
              path.resolve(__dirname, 'public/images', filename),
              path.resolve(__dirname, 'public', filename),
              path.resolve('/public/images', filename),
              path.resolve('/public', filename),
            ];

            targets.forEach(target => {
              try {
                fs.mkdirSync(path.dirname(target), { recursive: true });
                fs.writeFileSync(target, buffer);
              } catch {
                // ignore permission errors on non-existent paths
              }
            });

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, filename }));
          } catch (err) {
            res.statusCode = 500;
            const message = err instanceof Error ? err.message : String(err);
            res.end(JSON.stringify({ error: message }));
          }
        });
      });
    },
  };
}

export default defineConfig(() => {
  return {
    base: '/portalpals/', // 👈 Added to route static bundle path correctly on GitHub Pages
    plugins: [react(), tailwindcss(), assetUploadPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
