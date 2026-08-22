import app,{CenterGate} from "./intelligence-fusion-entry.js";
import {intelligenceMissionRoute} from "./intelligence-mission-orchestration.js";
export {CenterGate};
export default{
  async fetch(req,env,ctx){
    try{const mission=await intelligenceMissionRoute(req,env);if(mission)return mission}catch(error){return Response.json({ok:false,error:String(error?.message||error).slice(0,180),message:"Strategic intelligence mission request failed"},{status:error?.status||500,headers:{"cache-control":"no-store"}})}
    return app.fetch(req,env,ctx);
  },
  async scheduled(controller,env,ctx){if(typeof app.scheduled==="function")return app.scheduled(controller,env,ctx)}
};
