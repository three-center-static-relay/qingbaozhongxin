const TARGET="https://tjj.fujian.gov.cn/xxgk/jdsj/";
const bytes=s=>new TextEncoder().encode(String(s||"")).length;
const titleOf=html=>{const m=String(html||"").match(/<title[^>]*>([\s\S]*?)<\/title>/i);return m?m[1].replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim().slice(0,200):null};
export async function browserRunCnSelftest(env={}){
  if(!env?.BROWSER||typeof env.BROWSER.quickAction!=="function")return{ok:false,selftest:"browser-run-cn",target:TARGET,error:"BROWSER_BINDING_UNAVAILABLE",browser_ms_used:null,rendered_bytes:0,arbitrary_target:false,login_used:false,cookies_injected:false,captcha_bypass:false,anti_bot_evasion:false};
  try{
    const started=Date.now();
    const response=await env.BROWSER.quickAction("content",{url:TARGET,gotoOptions:{waitUntil:"domcontentloaded",timeout:15000}});
    const browserMsUsed=Number(response.headers.get("x-browser-ms-used")||0)||null;
    const raw=await response.text();
    let data=null;try{data=raw?JSON.parse(raw):null}catch{}
    const html=typeof data?.result==="string"?data.result:"";
    const marker=/福建省统计局|进度数据|tjj\.fujian\.gov\.cn/i.test(html);
    const ok=response.ok&&data?.success===true&&html.length>0&&Number(browserMsUsed)>0;
    return{ok,selftest:"browser-run-cn",target:TARGET,target_host:"tjj.fujian.gov.cn",quick_action:"content",browser_http_status:response.status,browser_ms_used:browserMsUsed,elapsed_ms:Date.now()-started,rendered_bytes:bytes(html),title:titleOf(html),content_marker_present:marker,binding:"BROWSER",api_token_used:false,arbitrary_target:false,login_used:false,cookies_injected:false,captcha_bypass:false,anti_bot_evasion:false,error:ok?null:"BROWSER_RUN_E2E_NOT_VERIFIED"};
  }catch(e){return{ok:false,selftest:"browser-run-cn",target:TARGET,error:"BROWSER_RUN_EXCEPTION",message:String(e?.message||e).slice(0,300),browser_ms_used:null,rendered_bytes:0,api_token_used:false,arbitrary_target:false,login_used:false,cookies_injected:false,captcha_bypass:false,anti_bot_evasion:false}}
}
