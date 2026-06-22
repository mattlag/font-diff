import { defineConfig } from 'vite';

// Ensure .wasm files are served with the correct MIME type during dev.
// Registered via configureServer so the middleware is actually applied
// (a top-level `server.middlewares` option is not valid and is ignored).
function wasmMimePlugin() {
	return {
		name: 'wasm-mime-type',
		configureServer(server) {
			server.middlewares.use((req, res, next) => {
				if (req.url && req.url.endsWith('.wasm')) {
					res.setHeader('Content-Type', 'application/wasm');
				}
				next();
			});
		},
	};
}

export default defineConfig({
	base: '/fontdiff/',
	plugins: [wasmMimePlugin()],
	optimizeDeps: {
		// Let brotli-wasm resolve its own .wasm asset URL instead of being
		// mangled by the dependency optimizer.
		exclude: ['brotli-wasm'],
	},
	build: {
		outDir: 'dist',
	},
	test: {
		environment: 'jsdom',
	},
});
