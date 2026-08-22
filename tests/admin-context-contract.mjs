import assert from "node:assert/strict";
import fs from "node:fs";

const entry=fs.readFileSync(new URL("../src/admin-entry.js",import.meta.url),"utf8");
const browserEntry=fs.readFileSync(new URL("../src/browser-run-interactive-cn-entry.js",import.meta.url),"utf8");
const fusionEntry=fs.readFileSync(new URL("../src/intelligence-fusion-entry.js",import.meta.url),"utf8");
const strategicEntry=fs.readFileSync(new URL("../src/strategic-intelligence-entry.js",import.meta.url),"utf8");
const wrangler=fs.readFileSync(new URL("../wrangler.jsonc",import.meta.url),"utf8");

assert.match(entry,/\/v1\/admin\/context/);
assert.match(entry,/intelligence\.internal/);
assert.match(entry,/admin_read_only:true/);
assert.match(entry,/CF_VERSION_METADATA/);
assert.match(entry,/active_task:gate\.active\|\|null/);
assert.match(entry,/secrets_redacted:true/);

assert.match(wrangler,/"main"\s*:\s*"src\/strategic-intelligence-entry\.js"/);
assert.match(strategicEntry,/from\s+"\.\/intelligence-fusion-entry\.js"/);
assert.match(strategicEntry,/intelligenceMissionRoute/);
assert.match(fusionEntry,/from\s+"\.\/browser-run-interactive-cn-entry\.js"/);
assert.match(fusionEntry,/intelligenceFusionRoute/);
assert.match(browserEntry,/from\s+"\.\/admin-entry\.js"/);
assert.match(entry,/from\s+"\.\/production-guard\.js"/);
assert.match(wrangler,/"version_metadata"\s*:\s*\{\s*"binding"\s*:\s*"CF_VERSION_METADATA"\s*\}/);
assert.match(wrangler,/"ai"\s*:\s*\{\s*"binding"\s*:\s*"AI"\s*\}/);
assert.match(wrangler,/"INTELLIGENCE_AI_ADVISORY_AUTOMATIC"\s*:\s*"false"/);
assert.match(wrangler,/"INTELLIGENCE_AUTO_PAID_BUDGET_USD"\s*:\s*"0"/);

assert.match(entry,/HF_RADAR_CANARY_MODEL="zai-org\/GLM-4\.7-Flash"/);
assert.match(entry,/\/v1\/selftest\/huggingface-router-runtime/);
assert.match(entry,/runAdapter\("huggingface","router_model"/);
assert.match(entry,/free_status_verified:explicitSignals\.length>0/);
assert.match(entry,/inference_called:false/);
assert.match(entry,/model_tokens_used:0/);
assert.match(entry,/cost_incurred:false/);

console.log(JSON.stringify({ok:true,suite:"intelligence-admin-context-contract",read_only:true,internal_admin_only:true,version_metadata:true,production_entry_chain:true,situational_fusion_wrapper:true,strategic_mission_wrapper:true,ai_advisory_automatic:false,auto_paid_budget_usd:0,huggingface_router_runtime_selftest:true,inference_called:false,model_tokens_used:0}));
