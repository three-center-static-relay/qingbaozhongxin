import guard,{CenterGate} from "./guard.js";
import {runLiteratureSelftest} from "./literature-selftest.js";
export {CenterGate};
const json=(x,s=200)=>Response.json(x,{status:s,headers:{"cache-control":"no-store"}});

export default{
  async fetch(req,env,ctx){
    const u=new URL(req.url);
    if(req.method==="POST"&&u.pathname==="/v1/selftest/literature"){
      if(u.hostname!=="intelligence.internal")return json({ok:false,error:"POLICY_DENIED",message:"literature selftest is service-binding internal only"},403);
      return runLiteratureSelftest(guard,env,ctx);
    }
    return guard.fetch(req,env,ctx);
  },
  async scheduled(controller,env,ctx){return guard.scheduled(controller,env,ctx)}
};
