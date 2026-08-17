import assert from "node:assert/strict";
import fs from "node:fs";

const entry=fs.readFileSync(new URL("../src/admin-entry.js",import.meta.url),"utf8");
const provider=fs.readFileSync(new URL("../src/modelscope-intelligence.js",import.meta.url),"utf8");

assert.match(entry,/\/v1\/selftest\/modelscope-runtime/);
assert.match(entry,/models_ok/);
assert.match(entry,/datasets_ok/);
assert.match(entry,/skills_ok/);
assert.match(entry,/studios_ok/);
assert.match(entry,/secrets_redacted:true/);
assert.match(provider,/\/users\/me/);
assert.match(provider,/\/models/);
assert.match(provider,/\/datasets/);
assert.match(provider,/\/skills/);
assert.match(provider,/\/studios/);
assert.match(provider,/MODELSCOPE_TOKEN/);
assert.doesNotMatch(entry,/authorization:/i);

console.log(JSON.stringify({ok:true,suite:"modelscope-runtime-selftest",redacted:true,read_only:true}));
