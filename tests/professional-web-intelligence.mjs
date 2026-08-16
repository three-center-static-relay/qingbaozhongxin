import assert from "node:assert/strict";
import {OPERATIONS} from "../src/adapters.js";
import {PROFESSIONAL_WEB_INTELLIGENCE} from "../src/domains/professional-web-intelligence.js";

assert.equal(PROFESSIONAL_WEB_INTELLIGENCE.id,"professional-web-intelligence");
assert.equal(PROFESSIONAL_WEB_INTELLIGENCE.label_zh,"专业网络信息收集");
assert.equal(PROFESSIONAL_WEB_INTELLIGENCE.replaces_center,false);
assert.equal(PROFESSIONAL_WEB_INTELLIGENCE.production_role,"shared-acquisition-branch");
assert.equal(PROFESSIONAL_WEB_INTELLIGENCE.collection_policy.multi_provider,true);
assert.equal(PROFESSIONAL_WEB_INTELLIGENCE.collection_policy.sequential_by_default,true);
assert.equal(PROFESSIONAL_WEB_INTELLIGENCE.collection_policy.cross_source_corroboration,true);
assert.equal(PROFESSIONAL_WEB_INTELLIGENCE.collection_policy.write_actions,false);
assert.equal(PROFESSIONAL_WEB_INTELLIGENCE.collection_policy.arbitrary_code,false);

const providers=Object.fromEntries(PROFESSIONAL_WEB_INTELLIGENCE.providers.map(x=>[x.id,x]));
assert.deepEqual(providers.exa.operations,["search"]);
assert.deepEqual(providers.tavily.operations,["search"]);
assert.deepEqual(providers.firecrawl.operations,["search"]);
assert.deepEqual(providers.jina.operations,["read"]);
assert.ok(OPERATIONS.exa?.includes("search"));
assert.ok(OPERATIONS.tavily?.includes("search"));
assert.ok(OPERATIONS.firecrawl?.includes("search"));
assert.ok(OPERATIONS.jina?.includes("read"));

const raw=JSON.stringify(PROFESSIONAL_WEB_INTELLIGENCE);
for(const forbidden of ["automatic-installation","write-back-from-search-results"]){assert.ok(raw.includes(forbidden))}
console.log(JSON.stringify({ok:true,suite:"professional-web-intelligence",branch:PROFESSIONAL_WEB_INTELLIGENCE.version,providers:["exa.search","tavily.search","firecrawl.search","jina.read"],shared_acquisition:true,write:false}));
