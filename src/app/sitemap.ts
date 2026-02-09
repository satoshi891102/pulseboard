import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: 'https://pulseboard-one.vercel.app', lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: 'https://pulseboard-one.vercel.app/dashboard', lastModified: new Date(), changeFrequency: 'always', priority: 0.9 },
    { url: 'https://pulseboard-one.vercel.app/compare', lastModified: new Date(), changeFrequency: 'always', priority: 0.8 },
    { url: 'https://pulseboard-one.vercel.app/watchlist', lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
    { url: 'https://pulseboard-one.vercel.app/history', lastModified: new Date(), changeFrequency: 'daily', priority: 0.6 },
  ]
}
