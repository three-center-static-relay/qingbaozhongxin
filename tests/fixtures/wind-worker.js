import {runAdapter} from "../../src/adapters-extra32.js";

export default{
  async fetch(req,env){
    const u=new URL(req.url);
    if(req.method!=="POST"||u.pathname!=="/wind")return Response.json({ok:false,error:"NOT_FOUND"},{status:404});
    try{
      const result=await runAdapter("aifin_market","list_tools",{server_type:"stock_data"},env);
      return Response.json({ok:true,source:result?.source||null,server_type:result?.server_type||null,tools:Array.isArray(result?.result?.tools)?result.result.tools.map(x=>x?.name).filter(Boolean):[]});
    }catch(error){
      return Response.json({ok:false,error:String(error?.message||error)},{status:Number(error?.status)||500});
    }
  }
};
