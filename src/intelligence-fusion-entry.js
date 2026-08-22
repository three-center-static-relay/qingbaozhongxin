import app,{CenterGate} from "./browser-run-interactive-cn-entry.js";
import {intelligenceFusionRoute} from "./intelligence-fusion-api.js";
export {CenterGate};
export default{
  async fetch(req,env,ctx){
    try{const fusion=await intelligenceFusionRoute(req,env);if(fusion)return fusion}catch(error){return Response.json({ok:false,error:String(error?.message||error).slice(0,180),message:"Intelligence fusion request failed"},{status:error?.status||500,headers:{"cache-control":"no-store"}})}
    return app.fetch(req,env,ctx);
  },
  async scheduled(controller,env,ctx){if(typeof app.scheduled==="function")return app.scheduled(controller,env,ctx)}
};
