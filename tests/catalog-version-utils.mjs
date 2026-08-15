import assert from "node:assert/strict";

function parseCatalogVersion(value){
  const s=String(value??"");
  const m=s.match(/^(\d{4})-(\d{2})-(\d{2})\.(\d+)$/);
  assert.ok(m,`invalid catalog version format: ${s}`);
  return [Number(m[1]),Number(m[2]),Number(m[3]),Number(m[4])];
}

export function assertCatalogAtLeast(actual,minimum,feature="catalog capability"){
  const a=parseCatalogVersion(actual),b=parseCatalogVersion(minimum);
  let cmp=0;
  for(let i=0;i<a.length;i++){if(a[i]>b[i]){cmp=1;break}if(a[i]<b[i]){cmp=-1;break}}
  assert.ok(cmp>=0,`${feature} requires catalog >= ${minimum}, got ${actual}`);
}
