export function createMediaRoutes({ response, readBody, profileMap, uploadFile, db, randomBytes, PROJECT_URL }) {
async function profileRoute(req,name) {
  if(req.method==="GET") return response({profiles:await profileMap()});
  const p=await readBody(req);
  const saved=await uploadFile("profile-images",String(p.dataUrl||""),2*1024*1024,new Set(["image/png","image/jpeg","image/webp","image/gif"]));
  await db.from("upstatus_profiles").upsert({user_name:name,avatar_url:saved.url,updated_at:new Date().toISOString()},{onConflict:"user_name"});
  return response({ok:true,avatarUrl:saved.url});
}
async function mediaRoute(req,kind) {
  const p=await readBody(req);
  const max=kind==="audio"?5*1024*1024:kind==="document"?10*1024*1024:25*1024*1024;
  const allowed=kind==="audio"?new Set(["audio/webm","audio/ogg","audio/mp4","audio/mpeg","audio/wav","audio/x-wav","audio/x-m4a"]):kind==="document"?new Set(["application/pdf","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document","application/vnd.ms-excel","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","text/csv","application/vnd.ms-powerpoint","application/vnd.openxmlformats-officedocument.presentationml.presentation","text/plain","text/rtf","application/rtf"]):new Set(["image/png","image/jpeg","image/webp","image/gif","video/mp4","video/webm"]);
  const saved=await uploadFile("chat-images",String(p.dataUrl||""),max,allowed);
  return response({ok:true,imageUrl:saved.url,type:saved.mime.startsWith("video/")?"video":kind});
}

async function signedUploadRoute(req,kind) {
  const p=await readBody(req);
  const bucket=kind==="avatar"?"profile-images":"chat-images";
  const max=20*1024*1024;
  const mime=String(p.mime||"").toLowerCase().trim();
  const allowed=kind==="avatar"?new Set(["image/png","image/jpeg","image/webp","image/gif"]):new Set(["image/png","image/jpeg","image/webp","video/mp4","video/webm","application/pdf","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document","application/vnd.ms-excel","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","text/csv","application/vnd.ms-powerpoint","application/vnd.openxmlformats-officedocument.presentationml.presentation","text/plain","text/rtf","application/rtf"]);
  const size=Number(p.size);
  if(!allowed.has(mime))return response({error:"Tipo de arquivo não suportado."},400);
  if(!Number.isFinite(size)||size<1||size>max)return response({error:"O arquivo deve ter no máximo 20 MB."},400);
  const extByMime={"image/png":"png","image/jpeg":"jpg","image/webp":"webp","image/gif":"gif","video/mp4":"mp4","video/webm":"webm","application/pdf":"pdf","application/msword":"doc","application/vnd.openxmlformats-officedocument.wordprocessingml.document":"docx","application/vnd.ms-excel":"xls","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":"xlsx","text/csv":"csv","application/vnd.ms-powerpoint":"ppt","application/vnd.openxmlformats-officedocument.presentationml.presentation":"pptx","text/plain":"txt","text/rtf":"rtf","application/rtf":"rtf"};
  const safeName=String(p.name||"arquivo").split(/[\\/]/).pop()?.replace(/[^a-zA-Z0-9._-]/g,"_").slice(-100)||"arquivo";
  const path=Date.now()+"-"+randomBytes(8).toString("hex")+"-"+safeName.replace(/\.[^.]*$/,"").slice(0,60)+"."+extByMime[mime];
  const {data,error}=await db.storage.from(bucket).createSignedUploadUrl(path,{upsert:true});
  if(error)throw error;
  const uploadToken=String(data?.token||"");
  const signedPath=String(data?.path||path);
  const signedUrl=String(data?.signedUrl||"");
  if(!uploadToken||!signedUrl||signedPath!==path)throw new Error("O Storage não retornou uma URL assinada válida.");
  const publicUrl=db.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  const uploadUrl=new URL(signedUrl,PROJECT_URL+"/storage/v1/");
  if(!uploadUrl.searchParams.has("token"))uploadUrl.searchParams.set("token",uploadToken);
  return response({ok:true,uploadUrl:uploadUrl.toString(),signedUrl:uploadUrl.toString(),publicUrl,token:uploadToken,path:signedPath,bucket,mime,size,expiresIn:7200});
}

  return { profileRoute, mediaRoute, signedUploadRoute };
}
