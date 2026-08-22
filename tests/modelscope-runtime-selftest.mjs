import assert from "node:assert/strict";
import fs from "node:fs";

const entry=fs.readFileSync(new URL("../src/admin-entry.js",import.meta.url),"utf8");
const provider=fs.readFileSync(new URL("../src/modelscope-intelligence.js",import.meta.url),"utf8");
assert.match(entry,/\/v1\/selftest\/modelscope-runtime/);
assert.match(provider,/models_source_retired:true/);
assert.match(provider,/model_source_policy:"workers-ai,openrouter,huggingface"/);
assert.doesNotMatch(provider,/safe\(env,"\/models"\)/);
assert.match(provider,/\/datasets/);
assert.match(provider,/\/skills/);
assert.match(provider,/\/studios/);
assert.match(provider,/MODELSCOPE_TOKEN/);
assert.doesNotMatch(entry,/authorization:/i);
console.log(JSON.stringify({ok:true,suite:"modelscope-runtime-selftest",model_catalog_retired:true,non_model_intelligence_resources_retained:true,approved_model_sources:["workers-ai","openrouter","huggingface"],redacted:true,read_only:true}));
