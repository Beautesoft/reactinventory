import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from "@tailwindcss/vite";
import path from "path"


// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),
    tailwindcss()
  ],
  
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: '0.0.0.0',    // Expose to all network interfaces
    port: 3000,         // Specify port number
    // strictPort: true,   // Exit if port is already in use
    // https: false,       // Enable/disable HTTPS
    // open: true,         // Auto-open in browser
    // proxy: {            // API Proxy configuration
    //   '/api': {
    //     target: 'http://localhost:8080',
    //     changeOrigin: true,
    //     rewrite: (path) => path.replace(/^\/api/, '')
    //   }
    // },
    // cors: true,         // Enable CORS
    // hmr: {              // Hot Module Replacement options
    //   overlay: true     // Show errors in browser overlay
    // }
  }
})
