import assert from "node:assert/strict";
import {runAdapter} from "../src/adapters-geonames-mobility.js";

const calls=[];
globalThis.fetch=async(url,init={})=>{
  calls.push({url:String(url),init});
  const u=new URL(String(url));
  if(u.hostname==="api.geonames.org"){
    assert.equal(u.pathname,"/searchJSON");
    assert.equal(u.searchParams.get("username"),"demo-user");
    assert.equal(u.searchParams.get("q"),"Fuzhou");
    assert.equal(u.searchParams.get("country"),"CN");
    return new Response(JSON.stringify({geonames:[{name:"Fuzhou",countryCode:"CN"}]}),{status:200,headers:{"content-type":"application/json"}});
  }
  if(u.hostname==="api.mobilitydatabase.org"&&u.pathname==="/v1/tokens"){
    assert.equal(init.method,"POST");
    assert.match(String(init.headers?.["content-type"]||""),/application\/json/);
    assert.deepEqual(JSON.parse(init.body),{refresh_token:"refresh-123"});
    return new Response(JSON.stringify({access_token:"fresh-access",expires_in:3600,token_type:"Bearer"}),{status:200,headers:{"content-type":"application/json"}});
  }
  if(u.hostname==="api.mobilitydatabase.org"&&u.pathname==="/v1/metadata"){
    assert.equal(init.headers?.authorization,"Bearer fresh-access");
    return new Response(JSON.stringify({version:"test"}),{status:200,headers:{"content-type":"application/json"}});
  }
  throw new Error(`UNEXPECTED_FETCH:${url}`);
};

const g=await runAdapter("geonames","search",{q:"Fuzhou",country:"CN",limit:5},{GEONAMES_USERNAME:"  demo-user  "});
assert.equal(g.data.geonames[0].name,"Fuzhou");

const m=await runAdapter("mobilitydatabase","metadata",{}, {MOBILITYDATABASE_ACCESS_TOKEN:"stale-access",MOBILITYDATABASE_REFRESH_TOKEN:"  refresh-123  "});
assert.equal(m.auth_mode,"refresh-token");
assert.equal(m.data.version,"test");
assert.equal(calls.filter(x=>x.url.includes("/v1/tokens")).length,1);
console.log(JSON.stringify({ok:true,suite:"geonames-mobility-auth-contract",geonames_canonical_api:true,secret_trim:true,mobility_refresh_preferred:true,mobility_json_exchange:true}));
