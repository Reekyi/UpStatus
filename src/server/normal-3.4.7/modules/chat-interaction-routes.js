export function createChatInteractionRoutes({ db, response, readBody, admin }) {
  async function readRoute(req,name){
    const p=await readBody(req);
    const ids=Array.isArray(p.messageIds)?p.messageIds.map(String).filter(Boolean).slice(0,1000):[];
    const {data:current}=await db.from("chat_reads").select("messages").eq("user_name",name).maybeSingle();
    const map=current?.messages&&typeof current.messages==="object"?{...current.messages}:{};
    if(ids.length){
      const {data:valid}=await db.from("messages").select("id,user_name").in("id",ids);
      const validIds=new Set((valid||[]).filter((x)=>x.user_name!==name).map((x)=>String(x.id)));
      for(const id of ids)if(validIds.has(id)){
        const list=Array.isArray(map[id])?[...map[id]]:[];
        if(!list.includes(name))list.push(name);
        map[id]=list;
      }
    }
    const {error}=await db.from("chat_reads").upsert({user_name:name,last_read_at:new Date().toISOString(),messages:map},{onConflict:"user_name"});
    if(error)throw error;
    return response({ok:true});
  }
  async function typingRoute(req,name){
    if(req.method==="GET"){
      const cutoff=new Date(Date.now()-4500).toISOString();
      const {data}=await db.from("upstatus_typing").select("user_name").gt("last_seen_at",cutoff).neq("user_name",name);
      return response({typing:(data||[]).map((x)=>x.user_name)});
    }
    const p=await readBody(req);
    if(p.typing===true)await db.from("upstatus_typing").upsert({user_name:name,last_seen_at:new Date().toISOString()},{onConflict:"user_name"});
    else await db.from("upstatus_typing").delete().eq("user_name",name);
    return response({ok:true});
  }
  async function reactionRoute(req,name){
    const p=await readBody(req),id=String(p.messageId||""),emoji=String(p.emoji||"");
    const allowed=new Set(["😂","❤️","👍","😡","😮","😢","👏","🔥","🤣","😍"]);
    if(!id||!allowed.has(emoji))return response({error:"Reação inválida."},400);
    const {data}=await db.from("messages").select("id,user_name,type,reactions").eq("id",id).maybeSingle();
    if(!data||data.type==="system")return response({error:"Mensagem não encontrada."},404);
    const reactions=data.reactions&&typeof data.reactions==="object"?{...data.reactions}:{};
    const list=Array.isArray(reactions[emoji])?[...reactions[emoji]]:[];
    const i=list.indexOf(name);if(i>=0)list.splice(i,1);else list.push(name);
    if(list.length)reactions[emoji]=list;else delete reactions[emoji];
    const {error}=await db.from("messages").update({reactions}).eq("id",id);
    if(error)throw error;
    return response({ok:true,reactions});
  }
  async function editRoute(req,name,id){
    const cleanId=String(id||"").trim();
    if(!cleanId)return response({error:"Mensagem inválida."},400);
    const p=await readBody(req),message=String(p.message||"").trim();
    if(!message)return response({error:"A mensagem não pode ficar vazia."},400);
    if(message.length>1000)return response({error:"A mensagem deve ter no máximo 1000 caracteres."},400);
    const {data}=await db.from("messages").select("id,user_name,message,type").eq("id",cleanId).maybeSingle();
    if(!data)return response({error:"Mensagem não encontrada."},404);
    if(data.user_name!==name)return response({error:"Você só pode editar suas próprias mensagens."},403);
    if(data.type!=="text")return response({error:"Somente mensagens de texto podem ser editadas."},400);
    const editedAt=new Date().toISOString();
    const {error}=await db.from("messages").update({message,edited_at:editedAt}).eq("id",cleanId);
    if(error)throw error;
    return response({ok:true,message:{id:cleanId,user:name,message,editedAt}});
  }
  
  async function deleteRoute(name,id){
    const {data}=await db.from("messages").select("id,user_name").eq("id",id).maybeSingle();
    if(!data)return response({error:"Mensagem não encontrada."},404);
    const isAdmin=name==="Ricardo"||await admin(name);
    if(data.user_name!==name&&!isAdmin)return response({error:"Você só pode excluir suas próprias mensagens."},403);
    const {error}=await db.from("messages").delete().eq("id",id);if(error)throw error;
    return response({ok:true,id,deletedByAdmin:data.user_name!==name});
  }
  return { readRoute, typingRoute, reactionRoute, editRoute, deleteRoute };
}
