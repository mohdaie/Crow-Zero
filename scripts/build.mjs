import {cp,mkdir,rm,writeFile} from 'node:fs/promises';
import {buildEditor,page} from './editor.mjs';
await mkdir('editor',{recursive:true});await writeFile('editor/index.html',page(await buildEditor()));
await rm('dist',{recursive:true,force:true});await mkdir('dist',{recursive:true});
for(const path of ['index.html','game.html','preview.html','editor','src','assets','vendor','tools/map-editor.html','.nojekyll'])await cp(path,'dist/'+path,{recursive:true});
console.log('Crow-Zero built: game at /, editor at /editor/, 3D preview.');
