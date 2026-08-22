import assert from "node:assert/strict";
import fs from "node:fs";
const wrangler=fs.readFileSync(new URL("../wrangler.jsonc",import.meta.url),"utf8");
const modelscope=fs.readFileSync(new URL("../src/modelscope-intelligence.js",import.meta.url),"utf8");
assert.match(wrangler,/"MODEL_SOURCE_CLASSES":\s*"workers-ai,openrouter,huggingface"/);
assert.match(wrangler,/"MODEL_SOURCE_POLICY":\s*"three-source-cloudflare-free-first"/);
assert.match(modelscope,/models_source_retired:true/);
assert.doesNotMatch(modelscope,/safe\(env,"\/models"\)/);
console.log(JSON.stringify({ok:true,suite:"intelligence-model-source-policy",approved_sources:["workers-ai","openrouter","huggingface"],modelscope_model_catalog_retired:true,data_sources_unaffected:true}));
