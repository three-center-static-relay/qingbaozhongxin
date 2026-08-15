import assert from "node:assert/strict";
import {readdirSync,readFileSync} from "node:fs";
import {join,basename} from "node:path";
import {fileURLToPath} from "node:url";

const dir=fileURLToPath(new URL("./",import.meta.url));
const self=basename(fileURLToPath(import.meta.url));
const offenders=[];
const exactA=["assert",".","equal","(","CATALOG_VERSION"].join("");
const exactB=["assert",".","strictEqual","(","CATALOG_VERSION"].join("");
for(const name of readdirSync(dir)){
  if(name===self||!name.endsWith(".mjs"))continue;
  const src=readFileSync(join(dir,name),"utf8");
  if(src.includes(exactA)||src.includes(exactB))offenders.push(name);
}
assert.deepEqual(offenders,[],`Exact CATALOG_VERSION equality is forbidden; use version-format plus capability minimum instead: ${offenders.join(",")}`);
console.log(JSON.stringify({ok:true,suite:"catalog-version-gate-hygiene",exact_version_gates:0,policy:"monotonic-capability-minimum"}));
