import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  
  // Optimize barrel file imports for better performance
  // This automatically transforms imports like `import { X } from 'lucide-react'`
  // to direct imports, reducing bundle size and improving cold start times
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-icons',
    ],
  },
}

export default nextConfig
