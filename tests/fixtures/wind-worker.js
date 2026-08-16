export default{
  async fetch(req){
    const u=new URL(req.url);
    if(req.method!=="POST"||u.pathname!=="/wind")return Response.json({ok:false,error:"NOT_FOUND"},{status:404});
    return Response.json({ok:true,stage:"static-workerd-harness"});
  }
};
