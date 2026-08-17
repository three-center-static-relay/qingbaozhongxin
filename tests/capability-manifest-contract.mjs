import assert from "node:assert/strict";
import {CAPABILITY_ABI_VERSION,intelligenceCapabilityManifest} from "../src/capability-manifest.js";

const manifest=intelligenceCapabilityManifest({catalogVersion:"test",providerStatuses:{openalex:{configured:true},semantic_scholar:{configured:true}}});
assert.equal(manifest.abi_version,CAPABILITY_ABI_VERSION);
assert.equal(manifest.center,"intelligence");
assert.ok(manifest.capabilities.length>=5);
const ids=new Set();
for(const capability of manifest.capabilities){
  assert.match(capability.id,/^[a-z0-9][a-z0-9._:-]+$/);
  assert.ok(capability.operations.length>0);
  assert.equal(capability.write_scope,"none");
  assert.equal(capability.trust.level,"T1");
  assert.equal(ids.has(capability.id),false);ids.add(capability.id);
}
assert.doesNotMatch(JSON.stringify(manifest),/token|password|authorization|cookie|api.?key/i);
console.log(JSON.stringify({ok:true,suite:"capability-manifest-contract",center:"intelligence",capability_count:manifest.capabilities.length}));
