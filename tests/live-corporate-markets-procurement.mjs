import assert from "node:assert/strict";
import {OPERATIONS,runAdapter} from "../src/adapters.js";
import {CATALOG,CATALOG_VERSION,statusFor} from "../src/catalog.js";
import {assertCatalogAtLeast} from "./catalog-version-utils.mjs";

assertCatalogAtLeast(CATALOG_VERSION,"2026-08-15.34","corporate/markets/procurement");
for(const p of ["companies_house_uk","opendart_korea","cftc_cot","ted_eu_procurement","splus_corporate_markets_procurement"]){assert.ok(CATALOG[p],`missing ${p}`);assert.equal(statusFor({},p)?.live_adapter,true,`${p} must be live`)}
assert.equal(statusFor({},"companies_house_uk")?.configured,false);assert.equal(statusFor({COMPANIES_HOUSE_API_KEY:"x"},"companies_house_uk")?.configured,true);
assert.equal(statusFor({},"opendart_korea")?.configured,false);assert.equal(statusFor({OPENDART_API_KEY:"x"},"opendart_korea")?.configured,true);
assert.equal(statusFor({},"cftc_cot")?.configured,true);assert.equal(statusFor({},"ted_eu_procurement")?.configured,true);
assert.ok(OPERATIONS.companies_house_uk.includes("search_companies"));assert.ok(OPERATIONS.opendart_korea.includes("major_accounts"));assert.ok(OPERATIONS.cftc_cot.includes("tff_combined"));assert.ok(OPERATIONS.ted_eu_procurement.includes("search"));

const calls=[];
globalThis.fetch=async(url,init={})=>{const u=String(url);calls.push({u,init});let body={};
 if(u.includes("company-information.service.gov.uk/search/companies"))body={total_results:1,items:[{company_number:"00000006",title:"MARINE AND GENERAL MUTUAL LIFE ASSURANCE SOCIETY"}]};
 else if(u.includes("company-information.service.gov.uk/company/"))body={company_number:"00000006",company_name:"TEST PLC"};
 else if(u.includes("engopendart.fss.or.kr/engapi/list.json"))body={status:"000",message:"Normal",page_no:1,total_count:1,list:[{corp_code:"00126380",report_nm:"Annual Report"}]};
 else if(u.includes("engopendart.fss.or.kr/engapi/company.json"))body={status:"000",corp_code:"00126380",corp_name:"TEST",crtfc_key:"DARTSECRET"};
 else if(u.includes("engopendart.fss.or.kr/engapi/fnlttSinglAcnt.json"))body={status:"000",list:[{account_nm:"Assets",thstrm_amount:"100"}]};
 else if(u.includes("publicreporting.cftc.gov/resource/yw9f-hn96.json"))body=[{market_and_exchange_names:"TEST",report_date_as_yyyy_mm_dd:"2026-08-11"}];
 else if(u.includes("publicreporting.cftc.gov/resource/kh3c-gbw2.json"))body=[{market_and_exchange_names:"TEST"}];
 else if(u.includes("publicreporting.cftc.gov/resource/rj6x-va3z.json"))body=[{contract_market_name:"TEST"}];
 else if(u==="https://api.ted.europa.eu/v3/notices/search")body={totalNoticeCount:1,notices:[{"publication-number":"123-2026","notice-title":"IT services"}]};
 const raw=JSON.stringify(body);return new Response(raw,{status:200,headers:{"content-type":"application/json","content-length":String(raw.length)}})};

const chKey="ch-test-key";
const ch=await runAdapter("companies_house_uk","search_companies",{query:"marine general",limit:10},{COMPANIES_HOUSE_API_KEY:chKey});assert.equal(ch.items.length,1);assert.ok(String(calls.at(-1).init.headers.authorization).startsWith("Basic "));assert.equal(String(calls.at(-1).init.headers.authorization).includes(chKey),false);
await assert.rejects(()=>runAdapter("companies_house_uk","company_profile",{company_number:"../../evil"},{COMPANIES_HOUSE_API_KEY:chKey}),/INVALID_COMPANY_NUMBER/);
await assert.rejects(()=>runAdapter("companies_house_uk","search_companies",{query:"x"},{}),/UPSTREAM_AUTH_FAILED/);

const dartKey="1234567890123456789012345678901234567890";
const disclosures=await runAdapter("opendart_korea","disclosures",{bgn_de:"20260601",end_de:"20260815",limit:20},{OPENDART_API_KEY:dartKey});assert.equal(disclosures.items.length,1);assert.ok(calls.at(-1).u.includes("page_count=20"));assert.ok(calls.at(-1).u.includes(`crtfc_key=${dartKey}`));assert.equal(JSON.stringify(disclosures).includes(dartKey),false);
await assert.rejects(()=>runAdapter("opendart_korea","disclosures",{bgn_de:"20250101",end_de:"20260815"},{OPENDART_API_KEY:dartKey}),/DART_DATE_RANGE_TOO_LARGE/);
const company=await runAdapter("opendart_korea","company",{corp_code:"00126380"},{OPENDART_API_KEY:dartKey});assert.equal(company.data.crtfc_key,"[redacted]");
const acct=await runAdapter("opendart_korea","major_accounts",{corp_code:"00126380",bsns_year:"2025",reprt_code:"11011"},{OPENDART_API_KEY:dartKey});assert.equal(acct.items[0].account_nm,"Assets");
await assert.rejects(()=>runAdapter("opendart_korea","major_accounts",{corp_code:"00126380",bsns_year:"2025",reprt_code:"99999"},{OPENDART_API_KEY:dartKey}),/INVALID_REPRT_CODE/);

const cot=await runAdapter("cftc_cot","tff_combined",{fields:["market_and_exchange_names","report_date_as_yyyy_mm_dd"],limit:50},{CFTC_APP_TOKEN:"CFTC-TOKEN"});assert.equal(cot.dataset_id,"yw9f-hn96");assert.equal(cot.items.length,1);assert.equal(calls.at(-1).init.headers["X-App-Token"],"CFTC-TOKEN");
await assert.rejects(()=>runAdapter("cftc_cot","tff_combined",{filters:{"$where":"1=1"}},{}),/INVALID_CFTC_FILTER_FIELD/);

const ted=await runAdapter("ted_eu_procurement","search",{query:"buyer-country = DEU",fields:["publication-number","notice-title"],limit:500,page:1},{});assert.equal(ted.items.length,1);const tedBody=JSON.parse(calls.at(-1).init.body);assert.equal(tedBody.limit,50);assert.equal(tedBody.paginationMode,"PAGE_NUMBER");assert.equal(tedBody.checkQuerySyntax,true);assert.equal("iterationNextToken" in tedBody,false);
await assert.rejects(()=>runAdapter("ted_eu_procurement","search",{query:"x",fields:["../../evil"]},{}),/INVALID_TED_FIELD/);
const umbrella=await runAdapter("splus_corporate_markets_procurement","catalog",{},{});assert.equal(umbrella.items.length,4);
console.log(JSON.stringify({ok:true,suite:"live-corporate-markets-procurement",providers:5,keyed:2,public:2,secret_redaction:true,no_raw_socrata_where:true,ted_page_mode_only:true}));
