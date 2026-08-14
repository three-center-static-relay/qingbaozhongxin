import base,{CenterGate as BaseCenterGate} from "./index.js";
const json=(x,s=200)=>Response.json(x,{status:s,headers:{"cache-control":"no-store"}});

// Harden the Durable Object gate so even the same task_id cannot re-enter while active.
// Durable Object requests are serialized, so this closes the last simultaneous duplicate-dispatch window.
export class CenterGate extends BaseCenterGate{
  constructor(state,env){super(state,env);this._state=state}
  async fetch(req){
    const u=new URL(req.url);
    if(req.method==="POST"&&u.pathname==="/acquire"){
      const a=await this._state.storage.get("active");
      if(a&&a.expires_at_ms<=Date.now())await this._state.storage.delete("active");
      else if(a)return json({ok:false,error:"BUSY",active:a,duplicate_reentry_blocked:true},409);
    }
    return super.fetch(req);
  }
}
function gate(env){return env.CENTER_GATE.get(env.CENTER_GATE.idFromName("global"))}
async function g(env,p,m="GET",b){const i={method:m,headers:{"content-type":"application/json"}};if(b!==undefined)i.body=JSON.stringify(b);const r=await gate(env).fetch(new Request(`https://gate.internal${p}`,i));return{http:r.status,...await r.json().catch(()=>({ok:false,error:"GATE_BAD_RESPONSE"}))}}
async function cancel(req,env){const b=await req.json().catch(()=>({})),id=String(b.task_id||"");if(!id)return json({ok:false,error:"INVALID_REQUEST",message:"task_id required"},400);const t=await g(env,`/task/${encodeURIComponent(id)}`);if(!t.task)return json({ok:false,error:"INVALID_REQUEST",message:"Task not found"},404);const r=await g(env,`/task/${encodeURIComponent(id)}/cancel`,"POST",{});return json({ok:r.ok,task:r.task||t.task,cancellation_pending:true,lock_retained:true,note:"Cancellation never releases the single-task lock before the execution path reaches a terminal state or the lease expires."},202)}
async function selftest(env,ctx){
  const taskId=`selftest-intelligence-${crypto.randomUUID()}`;
  const request=new Request("https://intelligence.internal/v1/run",{method:"POST",headers:{"content-type":"application/json","x-three-center-selftest":"1"},body:JSON.stringify({task_id:taskId,provider:"worldbank",operation:"indicator",timeout_seconds:30,args:{country:"CHN",indicator:"SP.POP.TOTL",date:"2023",limit:1}})});
  const started=Date.now();
  const r=await base.fetch(request,env,ctx),body=await r.json().catch(()=>null),items=body?.result?.items;
  const nonempty=Array.isArray(items)&&items.length>0,hasDigest=typeof body?.result_digest==="string"&&body.result_digest.length===64,task=await g(env,`/task/${encodeURIComponent(taskId)}`),terminal=task?.task?.status==="pass";
  const lock=await g(env,"/state"),released=!lock?.active;
  const ok=r.ok&&body?.ok===true&&nonempty&&hasDigest&&terminal&&released;
  return json({ok,business_e2e:true,cost_class:"public-zero-key",provider:"worldbank",operation:"indicator",task_id:taskId,http_status:r.status,nonempty,result_digest:hasDigest?body.result_digest:null,terminal_status:task?.task?.status||null,lock_released:released,elapsed_ms:Date.now()-started},ok?200:503);
}
export default{async fetch(req,env,ctx){try{const u=new URL(req.url);if(req.method==="POST"&&u.pathname==="/v1/cancel")return await cancel(req,env);if(req.method==="POST"&&u.pathname==="/v1/selftest")return await selftest(env,ctx);return await base.fetch(req,env,ctx)}catch(e){return json({ok:false,error:e?.message||"INTERNAL_ERROR",message:"Request failed"},e?.status||500)}}};
