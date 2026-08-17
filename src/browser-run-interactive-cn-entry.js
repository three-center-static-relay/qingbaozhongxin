import app,{CenterGate} from "./admin-entry.js";
import {browserRunInteractiveCnSelftest} from "./browser-run-interactive-cn-selftest.js";
export {CenterGate};
const SELFTEST_VERSION="browser-run-interactive-cn-v1-20260817";
const json=(body,status=200)=>Response.json(body,{status,headers:{"cache-control":"no-store"}});
export default{
  async fetch(req,env,ctx){
    const url=new URL(req.url);
    if(req.method==="GET"&&url.pathname==="/v1/selftest/browser-run-interactive-cn"){
      const result=await browserRunInteractiveCnSelftest(env);
      const stamped={...result,selftest_version:SELFTEST_VERSION};
      return json(stamped,stamped.ok===true?200:207);
    }
    return app.fetch(req,env,ctx);
  },
  async scheduled(controller,env,ctx){if(typeof app.scheduled==="function")return app.scheduled(controller,env,ctx)}
};
