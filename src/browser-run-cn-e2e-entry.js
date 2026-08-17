const TARGET="https://www.gov.cn/";
const PATH="/__browser-run-cn-e2e";
const json=(body,status=200)=>Response.json(body,{status,headers:{"cache-control":"no-store"}});
function titleOf(html){const m=String(html||"").match(/<title[^>]*>([\s\S]*?)<\/title>/i);return m?m[1].replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim().slice(0,200):null}
export default{
  async fetch(req,env){
    const u=new URL(req.url);
    if(req.method!=="GET"||u.pathname!==PATH)return json({ok:false,error:"NOT_FOUND"},404);
    if(!env?.BROWSER||typeof env.BROWSER.quickAction!=="function")return json({ok:false,error:"BROWSER_BINDING_UNAVAILABLE",target:TARGET},503);
    try{
      const started=Date.now();
      const r=await env.BROWSER.quickAction("content",{url:TARGET,gotoOptions:{waitUntil:"domcontentloaded",timeout:15000}});
      const browserMsUsed=Number(r.headers.get("x-browser-ms-used")||0)||null;
      const raw=await r.text();
      let data=null;try{data=raw?JSON.parse(raw):null}catch{}
      const html=typeof data?.result==="string"?data.result:"";
      const ok=r.ok&&data?.success===true&&html.length>0;
      return json({ok,test:"cloudflare-browser-run-cn-mainland-e2e",target:TARGET,target_host:"www.gov.cn",quick_action:"content",browser_response_status:r.status,browser_ms_used:browserMsUsed,elapsed_ms:Date.now()-started,rendered_bytes:new TextEncoder().encode(html).length,title:titleOf(html),content_marker_present:/中国政府网|www\.gov\.cn|gov\.cn/i.test(html),binding:"BROWSER",api_token_used:false,arbitrary_target:false,login_used:false,cookies_injected:false,captcha_bypass:false,anti_bot_evasion:false},ok?200:502);
    }catch(e){return json({ok:false,test:"cloudflare-browser-run-cn-mainland-e2e",target:TARGET,error:"BROWSER_RUN_EXCEPTION",message:String(e?.message||e).slice(0,300),api_token_used:false,arbitrary_target:false},502)}
  }
};
