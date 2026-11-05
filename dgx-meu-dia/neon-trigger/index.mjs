// Neon Function agendada: aciona o motor de Web Push do DGX.
// O segredo fica em variavel privada do Neon, nunca neste arquivo.
export default {
  async fetch(request) {
    if (request.method !== "POST" || !request.headers.get("x-neon-trigger-invocation-id")) {
      return new Response("Somente tarefas agendadas Neon", {status:403});
    }
    const secret=process.env.DISPATCH_SECRET;
    if (!secret) return new Response("Segredo nao configurado", {status:503});
    try {
      const upstream=await fetch("https://dgx-meu-dia.onrender.com/api/push/dispatch", {
        method:"POST",headers:{"Authorization":"Bearer "+secret,"Content-Type":"application/json"},
        body:"{}",signal:AbortSignal.timeout(105000)
      });
      if (!upstream.ok) return Response.json({ok:false,upstream_status:upstream.status},{status:502});
      return Response.json({ok:true});
    } catch (e) {
      return Response.json({ok:false,error:"upstream_unavailable"},{status:503});
    }
  }
};
