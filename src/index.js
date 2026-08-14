export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/health") return Response.json({ok:true,service:"intelligence-worker",source:"github-static-relay"});
    return Response.json({service:"intelligence-worker",status:"ready"});
  }
};
