import assert from "node:assert/strict";
import {readdirSync,readFileSync} from "node:fs";
import {join,basename} from "node:path";
import {fileURLToPath} from "node:url";

const dir=fileURLToPath(new URL("./",import.meta.url));
const self=basename(fileURLToPath(import.meta.url));
const exact=[],dateLocked=[],revisionOnly=[];
const exactA=["assert",".","equal","(","CATALOG_VERSION"].join("");
const exactB=["assert",".","strictEqual","(","CATALOG_VERSION"].join("");
for(const name of readdirSync(dir)){
  if(name===self||!name.endsWith(".mjs"))continue;
  const src=readFileSync(join(dir,name),"utf8");
  if(src.includes(exactA)||src.includes(exactB))exact.push(name);
  if(/assert\.match\(CATALOG_VERSION,\/\^20\d{2}-\d{2}-\d{2}/.test(src))dateLocked.push(name);
  if(/CATALOG_VERSION\.split\(["']\.["']\)\.at\(-1\)/.test(src))revisionOnly.push(name);
}
assert.deepEqual(exact,[],`Exact CATALOG_VERSION equality is forbidden; use assertCatalogAtLeast(): ${exact.join(",")}`);
assert.deepEqual(dateLocked,[],`Date-locked CATALOG_VERSION regex is forbidden; deployments must survive calendar rollover: ${dateLocked.join(",")}`);
assert.deepEqual(revisionOnly,[],`Revision-only CATALOG_VERSION comparison is forbidden; compare full date+revision with assertCatalogAtLeast(): ${revisionOnly.join(",")}`);
console.log(JSON.stringify({ok:true,suite:"catalog-version-gate-hygiene",exact_version_gates:0,date_locked_gates:0,revision_only_gates:0,policy:"full-date-plus-revision-monotonic-capability-minimum"}));
