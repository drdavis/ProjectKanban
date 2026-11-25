import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readdir,readFile} from 'node:fs/promises';
import ts from 'typescript';
test('form action buttons explicitly submit or handle their own click',async()=>{
 const missing=[];
 for(const file of (await readdir('components')).filter(f=>f.endsWith('.tsx'))){
  const source=ts.createSourceFile(file,await readFile('components/'+file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  function walk(node,inForm=false){
   if(ts.isJsxElement(node)){
    const tag=node.openingElement.tagName.getText(source),attrs=node.openingElement.attributes.properties.map(a=>a.name?.getText(source));
    if(tag==='Button'&&inForm&&!attrs.includes('type')&&!attrs.includes('onClick'))missing.push(file+': '+node.getText(source));
    inForm=inForm||tag==='form';
   }
   ts.forEachChild(node,child=>walk(child,inForm));
  }
  walk(source);
 }
 assert.deepEqual(missing,[]);
});
