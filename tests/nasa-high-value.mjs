import assert from "node:assert/strict";
import {runAdapter as run22,NASA_HIGH_VALUE} from "../src/adapters-extra22.js";
import {runAdapter as run23} from "../src/adapters-extra23.js";
import {CATALOG,statusFor} from "../src/catalog.js";

for(const p of ["nasa_cmr","nasa_stac","nasa_power","nasa_firms","nasa_gibs","nasa_harmony","nasa_ads"]){assert.ok(CATALOG[p],`missing ${p}`);assert.notEqual(CATALOG[p].adapter,"catalog-only",`${p} must be callable`);assert.equal(CATALOG[p].arbitrary_url,false,`${p} must deny arbitrary URLs`)}
for(const p of ["nasa_cmr","nasa_stac","nasa_power","nasa_gibs","nasa_harmony","nasa_firms"])assert.equal(statusFor({},p).configured,true,`${p} must expose its free/public branch without a paid credential`);
assert.equal(statusFor({},"nasa_ads").configured,false);
assert.ok(Object.keys(NASA_HIGH_VALUE).length>=20);
for(const id of ["merra2","gpm_imerg","smap","ecostress","gedi","swot","grace_fo","tempo","sedac","black_marble","modis","viirs","landsat","ceres","airs","oco2_oco3","pace","icesat2","srtm","gldas","hls"])assert.ok(NASA_HIGH_VALUE[id],`missing NASA high-value preset ${id}`);

const oldFetch=globalThis.fetch,seen=[];
try{
  globalThis.fetch=async(url,init={})=>{const u=String(url);seen.push({u,init});
    if(u.includes("cmr.earthdata.nasa.gov/search/collections.json"))return new Response(JSON.stringify({feed:{hits:1,entry:[{id:"C1",short_name:"MERRA2_TEST"}]}}),{status:200,headers:{"content-type":"application/json"}});
    if(u.includes("power.larc.nasa.gov"))return new Response(JSON.stringify({properties:{parameter:{T2M:{"20260801":30}}}}),{status:200,headers:{"content-type":"application/json"}});
    if(u.includes("WMTSCapabilities.xml"))return new Response('<Capabilities xmlns:ows="http://www.opengis.net/ows/1.1"><Contents><Layer><ows:Identifier>MODIS_Terra_Test</ows:Identifier></Layer><TileMatrixSet><ows:Identifier>250m</ows:Identifier></TileMatrixSet><Layer><ows:Identifier>VIIRS_Test</ows:Identifier></Layer></Contents></Capabilities>',{status:200,headers:{"content-type":"application/xml"}});
    if(u.includes("/api/countries"))return new Response('id;abreviation;name;extent\n45;CHN;China;BOX(73 18,135 54)',{status:200,headers:{"content-type":"text/csv"}});
    return new Response(JSON.stringify({}),{status:200,headers:{"content-type":"application/json"}});
  };
  const cmr=await run22("nasa_cmr","preset",{dataset:"merra2",limit:5},{});assert.equal(cmr.items.length,1);assert.match(seen.at(-1).u,/keyword=MERRA-2/);
  const power=await run23("nasa_power","point_daily",{latitude:26.08,longitude:119.30,start:"2026-08-01",end:"2026-08-02",parameters:["T2M","PRECTOTCORR"]},{});assert.ok(power.data.properties);assert.match(seen.at(-1).u,/parameters=T2M%2CPRECTOTCORR/);
  const gibs=await run23("nasa_gibs","layers",{query:"modis",limit:10},{});assert.deepEqual(gibs.items,["MODIS_Terra_Test"]);assert.equal(gibs.items.includes("250m"),false);
  const countries=await run23("nasa_firms","countries",{},{});assert.equal(countries.items[0].abreviation,"CHN");
  await assert.rejects(()=>run23("nasa_firms","area",{bbox:[118,25,120,27]},{}),/UPSTREAM_AUTH_FAILED/);
  await assert.rejects(()=>run23("nasa_firms","area",{bbox:[70,15,135,55],source:"VIIRS_NOAA20_NRT"},{NASA_FIRMS_MAP_KEY:"abcdefgh12345678"}),/BBOX_TOO_LARGE/);
  console.log(JSON.stringify({ok:true,suite:"nasa-high-value",cmr:true,power:true,gibs:true,firms_fail_closed:true,presets:Object.keys(NASA_HIGH_VALUE).length}));
}finally{globalThis.fetch=oldFetch}
