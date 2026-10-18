import {cp,mkdir,readFile,readdir,rm,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {buildEditor,page} from './editor.mjs';
await mkdir('editor',{recursive:true});await writeFile('editor/index.html',page(await buildEditor()));
await rm('dist',{recursive:true,force:true});await mkdir('dist',{recursive:true});
for(const path of ['index.html','game.html','preview.html','editor','src','assets','vendor','tools/map-editor.html','manifest.webmanifest','.nojekyll'])await cp(path,'dist/'+path,{recursive:true});
// Offline game: the service worker precaches the game page and everything it
// loads (not the editor or the preview), under a version hashed from them.
const files=['index.html','manifest.webmanifest'],UNUSED=['illustrated-horizon.webp','THREE-LICENSE.txt'];
for(const dir of ['src','vendor','assets'])for(const entry of await readdir('dist/'+dir,{recursive:true,withFileTypes:true}))if(entry.isFile()&&!UNUSED.includes(entry.name))files.push((entry.parentPath||entry.path).slice('dist/'.length)+'/'+entry.name);
files.sort();
const hash=createHash('sha1');for(const file of files)hash.update(file).update(await readFile('dist/'+file));
const version=hash.digest('hex').slice(0,12);
const worker=(await readFile('sw.js','utf8')).replace("/*@VERSION@*/'dev'",JSON.stringify(version)).replace('/*@FILES@*/[]',JSON.stringify(['./',...files]));
await writeFile('dist/sw.js',worker);
console.log(`Crow-Zero built: game at /, editor at /editor/, 3D preview; offline cache ${version} (${files.length} files).`);
