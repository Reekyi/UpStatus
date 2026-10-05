import { createClient } from "npm:@supabase/supabase-js@2";

const url = Deno.env.get("SUPABASE_URL")!;
const secrets = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
const key = secrets.default || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const db = createClient(url, key);

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-upstatus-token, authorization, apikey",
  "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
  "Cache-Control": "no-store"
};

const out = (body:unknown,status=200) =>
  new Response(JSON.stringify(body), {status, headers:{"Content-Type":"application/json; charset=utf-8",...headers}});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", {headers});
  try {
    const path = new URL(req.url).pathname;
    if (path === "/health" && req.method === "GET") return out({ok:true,version:"2.7.2",service:"UpStatus"});
    if (path === "/api/members" && req.method === "GET") {
      const {data,error}=await db.from("users").select("name").order("name");
      if(error) throw error;
      return out({members:(data||[]).map((x:any)=>({name:x.name}))});
    }
    if (path === "/api/status" && req.method === "GET") {
      const {data,error}=await db.from("users").select("name,status,reason,updated_at,sync").order("name");
      if(error) throw error;
      const members:Record<string,unknown>={};
      for(const x of data||[]) members[x.name]={name:x.name,status:x.status||"offline",reason:x.reason||"",updatedAt:x.updated_at||null,sync:x.sync||"not_configured"};
      return out({members});
    }
    return out({error:"Não encontrado."},404);
  } catch (e) {
    return out({error:e instanceof Error?e.message:"Erro interno."},500);
  }
});