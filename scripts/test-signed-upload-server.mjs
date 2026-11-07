import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source=fs.readFileSync("src/server/index.template.ts","utf8");
function extract(start,end,label){
  const i=source.indexOf(start),j=source.indexOf(end,i);
  assert.ok(i>=0&&j>i,label+" source block is missing");
  return source.slice(i,j).trim();
}
let profileSource=extract("async function profileRoute(req:Request,name:string) {","async function signedUploadRoute(","profileRoute");
let signedSource=extract("async function signedUploadRoute(req:Request,kind:\"chat\"|\"avatar\") {","async function mediaRoute(","signedUploadRoute");
profileSource=profileSource.replace("async function profileRoute(req:Request,name:string)","async function profileRoute(req,name)").replace("const p:any=","const p=").replace("let parsed:URL;","let parsed;");
signedSource=signedSource.replace("async function signedUploadRoute(req:Request,kind:\"chat\"|\"avatar\")","async function signedUploadRoute(req,kind)").replace("const p:any=","const p=").replace("const extByMime:Record<string,string>=","const extByMime=");
assert.ok(!/:Request|:string|:URL|:Record</.test(profileSource+signedSource),"test transpiler left a TypeScript annotation");

const project="https://test-project.supabase.co";
function harness(overrides={}){
  const calls={storage:[],upserts:[],legacyUploads:[]};
  const context=vm.createContext({
    PROJECT_URL:project,
    readBody:async req=>req.body||{},
    response:(body,status=200)=>({body,status}),
    randomBytes:n=>({toString:()=> "a".repeat(n*2)}),
    uploadFile:async(...args)=>{calls.legacyUploads.push(args);return {url:project+"/storage/v1/object/public/profile-images/legacy-avatar.png"};},
    db:{
      storage:{
        from:bucket=>({
          createSignedUploadUrl:async(path,options)=>{
            calls.storage.push({bucket,path,options});
            const token=overrides.token||"server-token";
            const data=overrides.signedData
              ?overrides.signedData({bucket,path,token})
              :{token,path,signedUrl:"/object/upload/sign/"+bucket+"/"+path+"?token="+encodeURIComponent(token)};
            return {data,error:null};
          },
          getPublicUrl:path=>({data:{publicUrl:overrides.publicUrl?overrides.publicUrl({bucket,path}):project+"/storage/v1/object/public/"+bucket+"/"+path}})
        })
      },
      from:table=>({upsert:async(row,options)=>{calls.upserts.push({table,row,options});return {error:null};}})
    }
  });
  vm.runInContext(profileSource+"\n"+signedSource+"\nglobalThis.__profileRoute=profileRoute;globalThis.__signedUploadRoute=signedUploadRoute;",context);
  return {context,calls};
}
const req=body=>({method:"POST",body});
{
  const h=harness();
  const r=await h.context.__signedUploadRoute(req({mime:"application/pdf",size:123,name:"Quarterly report.pdf"}),"chat");
  assert.equal(r.status,200);
  assert.equal(r.body.bucket,"chat-images");
  assert.equal(r.body.mime,"application/pdf");
  assert.equal(r.body.size,123);
  assert.equal(r.body.token,"server-token");
  assert.ok(r.body.uploadUrl.startsWith(project+"/storage/v1/object/upload/sign/chat-images/"));
  assert.ok(r.body.publicUrl.startsWith(project+"/storage/v1/object/public/chat-images/"));
  assert.equal(h.calls.storage.length,1);
  assert.equal(h.calls.storage[0].options.upsert,true);
}
{
  const h=harness();
  const r=await h.context.__signedUploadRoute(req({mime:"image/png",size:123,name:"avatar.png"}),"avatar");
  assert.equal(r.status,200);
  assert.equal(r.body.bucket,"profile-images");
  assert.equal(r.body.mime,"image/png");
}
{
  const h=harness();
  const r=await h.context.__signedUploadRoute(req({mime:"application/zip",size:123,name:"archive.zip"}),"chat");
  assert.equal(r.status,400);
  assert.equal(h.calls.storage.length,0);
}
for(const size of [0,-1,1.5,20*1024*1024+1]){
  const h=harness();
  const r=await h.context.__signedUploadRoute(req({mime:"image/png",size,name:"file.png"}),"chat");
  assert.equal(r.status,400);
  assert.equal(h.calls.storage.length,0);
}
{
  const h=harness({signedData:({bucket,path,token})=>({token,path,signedUrl:"https://attacker.example/storage/v1/object/upload/sign/"+bucket+"/"+path+"?token="+token})});
  await assert.rejects(()=>h.context.__signedUploadRoute(req({mime:"image/png",size:10,name:"x.png"}),"chat"),/origem ou rota de upload inesperada/);
}
{
  const h=harness({signedData:({bucket,path,token})=>({token,path,signedUrl:"/object/upload/sign/"+bucket+"/"+path+"?token=wrong"})});
  await assert.rejects(()=>h.context.__signedUploadRoute(req({mime:"image/png",size:10,name:"x.png"}),"chat"),/token da URL assinada/);
}
{
  const h=harness({signedData:({bucket,path,token})=>({token,path:path+"-other",signedUrl:"/object/upload/sign/"+bucket+"/"+path+"?token="+token})});
  await assert.rejects(()=>h.context.__signedUploadRoute(req({mime:"image/png",size:10,name:"x.png"}),"chat"),/caminho assinado/);
}
{
  const h=harness({signedData:({bucket,path,token})=>({token,path,signedUrl:"/object/upload/sign/"+bucket+"/"+path+"?token="+token+"#fragment"})});
  await assert.rejects(()=>h.context.__signedUploadRoute(req({mime:"image/png",size:10,name:"x.png"}),"chat"),/origem ou rota de upload inesperada/);
}
{
  const h=harness({publicUrl:({bucket,path})=>"https://attacker.example/storage/v1/object/public/"+bucket+"/"+path});
  await assert.rejects(()=>h.context.__signedUploadRoute(req({mime:"image/png",size:10,name:"x.png"}),"chat"),/URL pública retornada é inválida/);
}
{
  const h=harness();
  const avatar=project+"/storage/v1/object/public/profile-images/avatar.png";
  const r=await h.context.__profileRoute(req({avatarUrl:avatar}),"Alice");
  assert.equal(r.status,200);
  assert.equal(r.body.avatarUrl,avatar);
  assert.equal(h.calls.upserts.length,1);
  assert.equal(h.calls.upserts[0].row.avatar_url,avatar);
  assert.equal(h.calls.legacyUploads.length,0);
}
for(const avatarUrl of [
  "https://attacker.example/storage/v1/object/public/profile-images/avatar.png",
  project+"/storage/v1/object/public/chat-images/avatar.png",
  project+"/storage/v1/object/public/profile-images/avatar.png?download=1",
  project+"/storage/v1/object/public/profile-images/folder%2Favatar.png"
]){
  const h=harness();
  const r=await h.context.__profileRoute(req({avatarUrl}),"Alice");
  assert.equal(r.status,400);
  assert.equal(h.calls.upserts.length,0);
}
{
  const h=harness();
  const r=await h.context.__profileRoute(req({dataUrl:"data:image/png;base64,AAAA"}),"Alice");
  assert.equal(r.status,200);
  assert.equal(h.calls.legacyUploads.length,1);
  assert.equal(h.calls.legacyUploads[0][0],"profile-images");
  assert.equal(h.calls.upserts.length,1);
}
console.log("PASS signed-upload server validates bucket, path, token, MIME, size, HTTPS origin and profile compatibility.");
