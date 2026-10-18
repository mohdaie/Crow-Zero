import {cp,mkdir,rm,writeFile} from 'node:fs/promises';
import {buildEditor,page} from './editor.mjs';
await writeFile('tools/map-editor.html',page(await buildEditor()));
await rm('dist',{recursive:true,force:true});await mkdir('dist',{recursive:true});
for(const path of ['index.html','preview.html','src','assets','vendor','tools/map-editor.html','.nojekyll'])await cp(path,'dist/'+path,{recursive:true});
console.log('Crow-Zero built: editor and self-contained 3D preview.');
