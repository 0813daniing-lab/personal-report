const fs = require('fs');
const env = {
  VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || '',
  VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || ''
};
fs.mkdirSync('dist', { recursive: true });
fs.writeFileSync('dist/env.js', 'window.__ENV__ = ' + JSON.stringify(env) + ';\n');
console.log('skip build');
