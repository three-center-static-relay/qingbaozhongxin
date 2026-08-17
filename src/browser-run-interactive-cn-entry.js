import app,{CenterGate} from "./admin-entry.js";
import {browserRunInteractiveCnSelftest} from "./browser-run-interactive-cn-selftest.js";
import {browserRunInteractiveCnCase} from "./browser-run-interactive-cn-case.js";
export {CenterGate};
const SELFTEST_VERSION="browser-run-interactive-cn-v3-20260817";
const json=(body,status=200)=>Response.json(body,{status,headers:{"cache-control":"no-store"}});
async function aiRead(env){
  const target="https://tjj.fujian.gov.cn/xxgkzl/ndbg/";
  if(!env?.BROWSER?.quickAction)return{ok:false,error:"BROWSER_QUICK_ACTION_UNAVAILABLE",target};
  const r=await env.BROWSER.quickAction("json",{url:target,prompt:"Identify this page. Return the page title or section name, whether a visible next-page control exists, and the main type of information listed on the page. Be concise."});
  const browserMsUsed=Number(r.headers.get("x-browser-ms-used")||0)||null;
  const raw=await r.text();let parsed=null;try{parsed=raw?JSON.parse(raw):null}catch{}
  return{ok:r.ok&&parsed?.success===true,target,quick_action:"json",browser_http_status:r.status,browser_ms_used:browserMsUsed,ai_result:parsed?.result??null,workers_ai_used:true,custom_model_used:false,login_used:false,captcha_used:false};
}
export default{
  async fetch(req,env,ctx){
    const url=new URL(req.url);
    if(req.method==="GET"&&url.pathname==="/v1/selftest/browser-run-ai-read-cn"){
      try{const result=await aiRead(env);return json({...result,selftest_version:SELFTEST_VERSION},result.ok===true?200:207)}catch(e){return json({ok:false,error:"AI_READ_EXCEPTION",message:String(e?.message||e).slice(0,500),selftest_version:SELFTEST_VERSION},207)}
    }
    if(req.method==="GET"&&url.pathname==="/v1/selftest/browser-run-interactive-cn"){
      const result=await browserRunInteractiveCnSelftest(env);
      const stamped={...result,selftest_version:SELFTEST_VERSION};
      return json(stamped,stamped.ok===true?200:207);
    }
    const prefix="/v1/selftest/browser-run-interactive-cn/";
    if(req.method==="GET"&&url.pathname.startsWith(prefix)){
      const name=url.pathname.slice(prefix.length);
      const result=await browserRunInteractiveCnCase(env,name);
      const stamped={...result,selftest_version:SELFTEST_VERSION};
      return json(stamped,stamped.ok===true?200:207);
    }
    return app.fetch(req,env,ctx);
  },
  async scheduled(controller,env,ctx){if(typeof app.scheduled==="function")return app.scheduled(controller,env,ctx)}
};
