import assert from "node:assert/strict";
import {OPERATIONS,runAdapter} from "../src/adapters.js";
import {CATALOG,statusFor} from "../src/catalog.js";

// Monotonic operation gate: require the bounded policy operations without deleting safe legacy operations preserved by the central union.
for(const p of ["federal_register","congress_gov","regulations_gov","splus_policy_regulatory_primary"]){assert.ok(CATALOG[p],`missing ${p}`);assert.equal(statusFor({},p)?.live_adapter,true,`${p} must be live`)}
assert.equal(statusFor({},"federal_register")?.configured,true);
assert.equal(statusFor({},"congress_gov")?.configured,false);assert.equal(statusFor({CONGRESS_GOV_API_KEY:"x"},"congress_gov")?.configured,true);
assert.equal(statusFor({},"regulations_gov")?.configured,false);assert.equal(statusFor({REGULATIONS_GOV_API_KEY:"x"},"regulations_gov")?.configured,true);
for(const op of ["documents","document","agencies"])assert.ok(OPERATIONS.federal_register.includes(op),`missing federal_register.${op}`);
assert.ok(OPERATIONS.congress_gov.includes("bills")&&OPERATIONS.congress_gov.includes("bill_actions"));
assert.ok(OPERATIONS.regulations_gov.includes("documents")&&OPERATIONS.regulations_gov.includes("dockets"));
assert.equal(OPERATIONS.regulations_gov.includes("comments"),false,"comments must not be exposed");

const calls=[];
globalThis.fetch=async(url,init={})=>{const u=String(url);calls.push({u,init});let body={};
 if(u.includes("federalregister.gov/api/v1/documents.json"))body={count:1,results:[{document_number:"2026-12345",title:"Test Rule",type:"Rule"}]};
 else if(u.includes("federalregister.gov/api/v1/documents/2026-12345.json"))body={document_number:"2026-12345",title:"Test Rule"};
 else if(u.includes("federalregister.gov/api/v1/agencies.json"))body=[{id:1,name:"Environmental Protection Agency",slug:"environmental-protection-agency"}];
 else if(u.includes("api.congress.gov/v3/bill/119/hr/1/actions"))body={actions:[{text:"Introduced"}],pagination:{count:1},api_key:"CONGRESS-SECRET"};
 else if(u.includes("api.congress.gov/v3/bill/119/hr/1"))body={bill:{congress:119,type:"HR",number:"1",title:"Test bill"},api_key:"CONGRESS-SECRET"};
 else if(u.includes("api.congress.gov/v3/bill"))body={bills:[{congress:119,type:"HR",number:"1",title:"Test bill"}],pagination:{count:1},api_key:"CONGRESS-SECRET"};
 else if(u.includes("api.regulations.gov/v4/documents/EPA-HQ-OAR-2026-0001"))body={data:{id:"EPA-HQ-OAR-2026-0001",type:"documents",attributes:{title:"Rulemaking document"}},"x-api-key":"REGS-SECRET"};
 else if(u.includes("api.regulations.gov/v4/dockets/EPA-HQ-OAR-2026-0001"))body={data:{id:"EPA-HQ-OAR-2026-0001",type:"dockets",attributes:{title:"Docket"}},"x-api-key":"REGS-SECRET"};
 else if(u.includes("api.regulations.gov/v4/documents"))body={data:[{id:"EPA-HQ-OAR-2026-0001",type:"documents"}],meta:{hasNextPage:false},"x-api-key":"REGS-SECRET"};
 else if(u.includes("api.regulations.gov/v4/dockets"))body={data:[{id:"EPA-HQ-OAR-2026-0001",type:"dockets"}],meta:{hasNextPage:false},"x-api-key":"REGS-SECRET"};
 const raw=JSON.stringify(body);return new Response(raw,{status:200,headers:{"content-type":"application/json","content-length":String(raw.length)}})};

const fr=await runAdapter("federal_register","documents",{query:"artificial intelligence",agencies:["commerce-department"],start_date:"2026-01-01",end_date:"2026-08-15",limit:10},{});
assert.equal(fr.items.length,1);assert.match(fr.legal_note,/govinfo|official Federal Register/i);assert.ok(calls.at(-1).u.includes("conditions%5Bterm%5D=artificial+intelligence"));
const frd=await runAdapter("federal_register","document",{document_number:"2026-12345"},{});assert.equal(frd.data.document_number,"2026-12345");
await assert.rejects(()=>runAdapter("federal_register","document",{document_number:"https://evil.example"},{}),/INVALID_DOCUMENT_NUMBER/);

const congressEnv={CONGRESS_GOV_API_KEY:"CONGRESS-SECRET"};
const bills=await runAdapter("congress_gov","bills",{congress:119,bill_type:"hr",limit:25},congressEnv);assert.equal(bills.items.length,1);assert.ok(calls.at(-1).u.includes("api_key=CONGRESS-SECRET"));assert.ok(calls.at(-1).u.includes("format=json"));assert.equal(JSON.stringify(bills).includes("CONGRESS-SECRET"),false);
const bill=await runAdapter("congress_gov","bill",{congress:119,bill_type:"hr",bill_number:1},congressEnv);assert.equal(bill.data.number,"1");
const actions=await runAdapter("congress_gov","bill_actions",{congress:119,bill_type:"hr",bill_number:1},congressEnv);assert.equal(actions.items[0].text,"Introduced");
await assert.rejects(()=>runAdapter("congress_gov","bills",{congress:119},{}),/UPSTREAM_AUTH_FAILED/);
await assert.rejects(()=>runAdapter("congress_gov","bill",{congress:119,bill_type:"evil",bill_number:1},congressEnv),/INVALID_BILL_TYPE/);

const regsEnv={REGULATIONS_GOV_API_KEY:"REGS-SECRET"};
const docs=await runAdapter("regulations_gov","documents",{query:"emissions",agency_id:["EPA"],start_date:"2026-01-01",end_date:"2026-08-15",limit:25},regsEnv);assert.equal(docs.items.length,1);assert.equal(calls.at(-1).init.headers["X-Api-Key"],"REGS-SECRET");assert.equal(calls.at(-1).u.includes("REGS-SECRET"),false);assert.equal(JSON.stringify(docs).includes("REGS-SECRET"),false);
const docket=await runAdapter("regulations_gov","docket",{docket_id:"EPA-HQ-OAR-2026-0001"},regsEnv);assert.equal(docket.data.id,"EPA-HQ-OAR-2026-0001");
await assert.rejects(()=>runAdapter("regulations_gov","documents",{query:"x"},{}),/UPSTREAM_AUTH_FAILED/);
await assert.rejects(()=>runAdapter("regulations_gov","document",{document_id:"https://evil.example"},regsEnv),/INVALID_DOCUMENT_ID/);
const umbrella=await runAdapter("splus_policy_regulatory_primary","catalog",{},{});assert.equal(umbrella.items.length,3);assert.match(umbrella.items[0].legal_note,/govinfo/i);assert.match(umbrella.items[2].write_policy,/read-only/i);
console.log(JSON.stringify({ok:true,suite:"live-policy-regulatory-primary",providers:4,read_only:true,comments_excluded:true,official_legal_crosscheck:true,secret_redaction:true}));
