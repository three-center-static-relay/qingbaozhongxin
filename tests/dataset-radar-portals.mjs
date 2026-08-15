import assert from "node:assert/strict";
import {PORTALS,parsePortalMarkdown,portalsForDay,portalRadarMeta,__test} from "../src/dataset-radar-portals.js";

assert.equal(PORTALS.length,15);
assert.equal(PORTALS.filter(x=>x.region==="CN").length,10);
assert.equal(PORTALS.filter(x=>x.region==="GLOBAL").length,5);
assert.ok(PORTALS.every(x=>x.url.startsWith("https://")&&x.domain&&x.path_hints?.length));
assert.equal(portalRadarMeta().arbitrary_target,false);
assert.equal(portalRadarMeta().raw_page_archive,false);
assert.equal(portalRadarMeta().scheduled_portals_per_day,2);
assert.equal(portalsForDay(Date.UTC(2026,7,16)).length,2);
assert.equal(portalsForDay(Date.UTC(2026,7,16))[0].region,"CN");
assert.equal(portalsForDay(Date.UTC(2026,7,16))[1].region,"GLOBAL");

const tianchi=PORTALS.find(x=>x.id==="tianchi_portal");
const md=`
[中国商业数据集](https://tianchi.aliyun.com/dataset/12345)
[外部恶意链接](https://evil.example/dataset/1)
[我的照片人脸数据](https://tianchi.aliyun.com/dataset/99999)
[普通首页](https://tianchi.aliyun.com/)
`;
const parsed=parsePortalMarkdown(tianchi,md);
assert.equal(parsed.length,1);
assert.equal(parsed[0].title,"中国商业数据集");
assert.equal(parsed[0].china_match,true);
assert.ok(parsed[0].score>0);
assert.equal(__test.allowedLink(tianchi,"https://evil.example/dataset/1"),null);
assert.equal(__test.hasSensitive("身份证号码库"),true);
assert.equal(__test.hasSensitive("我的照片"),true);

const realFetch=globalThis.fetch,calls=[];
try{
  globalThis.fetch=async(url,init={})=>{
    calls.push({url:String(url),init});
    assert.equal(String(url),"https://r.jina.ai/https://tianchi.aliyun.com/dataset/public");
    const body="[中国金融数据](https://tianchi.aliyun.com/dataset/54321)\n[越权](https://evil.example/x)";
    return new Response(body,{status:200,headers:{"content-type":"text/plain","content-length":String(body.length)}})
  };
  const out=await __test.collectOne(tianchi);
  assert.equal(out.portal,"tianchi_portal");
  assert.equal(out.items.length,1);
  assert.equal(calls.length,1);
  assert.equal(calls[0].init.headers["x-retain-images"],"none");
}finally{globalThis.fetch=realFetch}

console.log(JSON.stringify({ok:true,suite:"dataset-radar-portals",portals:PORTALS.length,china:10,global:5,fixed_targets:true,sensitive_filter:true,no_raw_archive:true,external_links_denied:true}));
