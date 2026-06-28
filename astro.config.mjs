import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

// BullDozer is served from https://shpara.com/bulldozer
export default defineConfig({
  site: 'https://shpara.com',
  base: '/bulldozer',
  trailingSlash: 'ignore',
  integrations: [mdx()],
});
