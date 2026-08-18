import assert from "node:assert/strict";
import fs from "node:fs";

const pkg=JSON.parse(fs.readFileSync(new URL("../package.json",import.meta.url),"utf8"));
const doc=fs.readFileSync(new URL("../CLOUDFLARE_BUILDS.md",import.meta.url),"utf8");

assert.equal(pkg.scripts?.["cf:build"],"npm run test:build-gate");
assert.equal(pkg.scripts?.["cf:preview"],"npm run cf:build && npx wrangler deploy --dry-run");
assert.equal(pkg.scripts?.["cf:deploy"],"npm run cf:build && npx wrangler deploy");
assert.match(doc,/Production branch\s*\|\s*`main`/);
assert.match(doc,/Production deploy command\s*\|\s*`npm run cf:deploy`/);
assert.match(doc,/Non-production deploy command\s*\|\s*`npm run cf:preview`/);
assert.match(doc,/exclude `main`/);
assert.match(doc,/preview builds.*do not promote/i);

console.log(JSON.stringify({
  ok:true,
  suite:"cloudflare-build-contract",
  production_branch:"main",
  production_command:"npm run cf:deploy",
  preview_command:"npm run cf:preview",
  preview_promotes_traffic:false
}));
