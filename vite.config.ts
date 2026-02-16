import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: '0.0.0.0', // Bind to all IPv4 interfaces
    port: 8080,
    strictPort: false,
    cors: true, // Enable CORS
    hmr: {
      port: 8080, // Use same port for HMR
    },
    // Add proxy for potential API issues
    proxy: {
      // If you have any API routes that need proxying
    },
  },
  // Ensure environment variables are properly loaded
  define: {
    // Explicitly define env vars if needed
    __DEV__: mode === 'development',
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Optimize build for production
    target: 'es2015',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.logs in production
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor chunks for better caching
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['framer-motion', 'lucide-react'],
          'supabase-vendor': ['@supabase/supabase-js'],
          'maps-vendor': ['react-leaflet', 'leaflet'],
        },
      },
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
    // Enable source maps for debugging (optional, can disable for smaller builds)
    sourcemap: false,
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@supabase/supabase-js',
      'framer-motion',
      'lucide-react',
    ],
  },
}));
