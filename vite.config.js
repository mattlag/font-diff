import { defineConfig } from 'vite';

export default defineConfig({
	base: '/fontdiff/',
	build: {
		outDir: 'dist',
	},
	test: {
		environment: 'jsdom',
	},
});
