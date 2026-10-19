import {build} from 'esbuild';
import {mkdir,copyFile,cp,rm} from 'node:fs/promises';
await rm('dist',{recursive:true,force:true});
await mkdir('dist',{recursive:true});
for(const file of ['index.html','styles.css','app.js','model.js','data.js','calendar.js','sync.js','cloud.js','cloud-config.js','workout-editor.js','theme.js','icon.svg','manifest.webmanifest'])await copyFile(file,`dist/${file}`);
await cp('assets','dist/assets',{recursive:true});
await build({stdin:{contents:"export {createClient} from '@supabase/supabase-js';",resolveDir:process.cwd(),loader:'js'},outfile:'dist/vendor/supabase.js',bundle:true,format:'esm',platform:'browser',minify:true,legalComments:'eof'});
console.log('Static build ready: dist/');
