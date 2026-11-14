import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";

const source=fs.readFileSync("src/server/index.template.ts","utf8");
function extract(start,end,label){
  const i=source.indexOf(start),j=source.indexOf(end,i);
  assert.ok(i>=0&&j>i,label+" source block is missing");
  return source.slice(i,j).trim();
}
const uploadHelpersStart=source.indexOf("function decodeDataUrl(raw:string) {");
const contextNameStart=source.indexOf("async function contextName(req:Request)",uploadHelpersStart);
assert.ok(uploadHelpersStart>=0&&contextNameStart>uploadHelpersStart,"server upload validation helpers must exist");
let uploadHelpers=source.slice(uploadHelpersStart,contextNameStart).trim();
const identityStart=source.indexOf("function uniqueAvatarUserId(rows:any[]) {");
const profileStart=source.indexOf("async function profileRoute(req:Request,name:string) {");
const signedStart=source.indexOf('async function signedUploadRoute(req:Request,kind:"chat"|"avatar",ownerName:string) {');
const mediaStart=source.indexOf("async function mediaRoute(",signedStart);
assert.ok(identityStart>=0&&profileStart>identityStart&&signedStart>profileStart&&mediaStart>signedStart,"immutable identity, profile and signed-upload blocks must exist in order");
uploadHelpers=uploadHelpers
  .replace("function decodeDataUrl(raw:string)","function decodeDataUrl(raw)")
  .replace("function sniffMime(bytes:Uint8Array,declared:string)","function sniffMime(bytes,declared)")
  .replace("function ext(mime:string)","function ext(mime)")
  .replace(" as Record<string,string>","")
  .replace('async function uploadFile(bucket:string,dataUrl:string,max:number,allowed:Set<string>,pathPrefix="")','async function uploadFile(bucket,dataUrl,max,allowed,pathPrefix="")');
assert.ok(!/:string|:Uint8Array|:Set</.test(uploadHelpers),"test transpiler left an upload-helper TypeScript annotation");
assert.ok(!uploadHelpers.includes(" as Record<string,string>"),"test transpiler left a TypeScript record cast");
let profileSource=source.slice(identityStart,signedStart).trim();
let signedSource=source.slice(signedStart,mediaStart).trim();
profileSource=profileSource
  .replace("function uniqueAvatarUserId(rows:any[])","function uniqueAvatarUserId(rows)")
  .replace("async function avatarUserId(name:string)","async function avatarUserId(name)")
  .replace("function avatarOwnerPrefix(userId:string|number)","function avatarOwnerPrefix(userId)")
  .replace("async function profileRoute(req:Request,name:string)","async function profileRoute(req,name)")
  .replace("const p:any=","const p=")
  .replace("let parsed:URL;","let parsed;");
signedSource=signedSource
  .replace('async function signedUploadRoute(req:Request,kind:"chat"|"avatar",ownerName:string)',"async function signedUploadRoute(req,kind,ownerName)")
  .replace("const p:any=","const p=")
  .replace("const extByMime:Record<string,string>=","const extByMime=");
assert.ok(!/:Request|:string|:URL|:Record</.test(profileSource+signedSource),"test transpiler left a TypeScript annotation");

const project="https://test-project.supabase.co";
function harness(overrides={}){
  const calls={storage:[],upserts:[],uploads:[]};
  const users=overrides.users||[{id:42,name:"Alice"}];
  const context=vm.createContext({
    PROJECT_URL:project,
    URL,Date,atob,Uint8Array,
    tokenHash:value=>createHash("sha256").update(String(value)).digest("hex"),
    readBody:async req=>req.body||{},
    response:(body,status=200)=>({body,status}),
    randomBytes:n=>({toString:()=> "a".repeat(n*2)}),
    db:{
      storage:{
        from:bucket=>({
          createSignedUploadUrl:async(path,options)=>{
            calls.storage.push({bucket,path,options});
            const token=overrides.token||"server-token";
            const data=overrides.signedData
              ?overrides.signedData({bucket,path,token})
              :{token,path,signedUrl:project+"/storage/v1/object/upload/sign/"+bucket+"/"+path+"?token="+encodeURIComponent(token)};
            return {data,error:null};
          },
          getPublicUrl:path=>({data:{publicUrl:overrides.publicUrl?overrides.publicUrl({bucket,path}):project+"/storage/v1/object/public/"+bucket+"/"+path}}),
          upload:async(path,body,options)=>{calls.uploads.push({bucket,path,bytes:Array.from(new Uint8Array(body)),options});return {error:null};}
        })
      },
      from:table=>{
        if(table==="users"){
          return {select:()=>({eq:(column,value)=>({limit:async n=>({data:users.filter(row=>String(row[column])===String(value)).slice(0,n),error:null})})})};
        }
        return {upsert:async(row,options)=>{calls.upserts.push({table,row,options});return {error:null};}};
      }
    }
  });
  vm.runInContext(uploadHelpers+"\n"+profileSource+"\n"+signedSource+"\nglobalThis.__profileRoute=profileRoute;globalThis.__signedUploadRoute=signedUploadRoute;globalThis.__avatarOwnerPrefix=avatarOwnerPrefix;globalThis.__uniqueAvatarUserId=uniqueAvatarUserId;",context);
  return {context,calls};
}
const req=body=>({method:"POST",body});
{
  const h=harness();
  const r=await h.context.__signedUploadRoute(req({mime:"application/pdf",size:123,name:"Quarterly report.pdf"}),"chat","Alice");
  assert.equal(r.status,200);
  assert.equal(r.body.bucket,"chat-images");
  assert.equal(r.body.mime,"application/pdf");
  assert.equal(r.body.size,123);
  assert.equal(r.body.token,"server-token");
  assert.ok(r.body.uploadUrl.startsWith(project+"/storage/v1/object/upload/sign/chat-images/"));
  assert.ok(r.body.publicUrl.startsWith(project+"/storage/v1/object/public/chat-images/"));
  assert.equal(h.calls.storage.length,1);
  assert.equal(h.calls.storage[0].options.upsert,false);
}
{
  const h=harness();
  const r=await h.context.__signedUploadRoute(req({mime:"image/png",size:123,name:"avatar.png"}),"avatar","Alice");
  assert.equal(r.status,410);
  assert.equal(h.calls.storage.length,0);
}
{
  const h=harness();
  const r=await h.context.__signedUploadRoute(req({mime:"application/zip",size:123,name:"archive.zip"}),"chat","Alice");
  assert.equal(r.status,400);
  assert.equal(h.calls.storage.length,0);
}
for(const size of [0,-1,1.5,20*1024*1024+1]){
  const h=harness();
  const r=await h.context.__signedUploadRoute(req({mime:"image/png",size,name:"file.png"}),"chat","Alice");
  assert.equal(r.status,400);
  assert.equal(h.calls.storage.length,0);
}
{
  const h=harness();
  const r=await h.context.__signedUploadRoute(req({mime:"image/png",size:2*1024*1024+1,name:"avatar.png"}),"avatar","Alice");
  assert.equal(r.status,410);
  assert.equal(h.calls.storage.length,0);
}
{
  const h=harness({signedData:({bucket,path,token})=>({token,path,signedUrl:"https://attacker.example/storage/v1/object/upload/sign/"+bucket+"/"+path+"?token="+token})});
  await assert.rejects(()=>h.context.__signedUploadRoute(req({mime:"image/png",size:10,name:"x.png"}),"chat","Alice"),/origem ou rota de upload inesperada/);
}
{
  const h=harness({signedData:({bucket,path,token})=>({token,path,signedUrl:project+"/storage/v1/object/upload/sign/"+bucket+"/"+path+"?token=wrong"})});
  await assert.rejects(()=>h.context.__signedUploadRoute(req({mime:"image/png",size:10,name:"x.png"}),"chat","Alice"),/token da URL assinada/);
}
{
  const h=harness({signedData:({bucket,path,token})=>({token,path:path+"-other",signedUrl:project+"/storage/v1/object/upload/sign/"+bucket+"/"+path+"?token="+token})});
  await assert.rejects(()=>h.context.__signedUploadRoute(req({mime:"image/png",size:10,name:"x.png"}),"chat","Alice"),/URL assinada válida/);
}
{
  const h=harness({signedData:({bucket,path,token})=>({token,path,signedUrl:project+"/storage/v1/object/upload/sign/"+bucket+"/"+path+"-other?token="+token})});
  await assert.rejects(()=>h.context.__signedUploadRoute(req({mime:"image/png",size:10,name:"x.png"}),"chat","Alice"),/caminho assinado/);
}
{
  const h=harness({signedData:({bucket,path,token})=>({token,path,signedUrl:project+"/storage/v1/object/upload/sign/"+bucket+"/"+path+"?token="+token+"#fragment"})});
  await assert.rejects(()=>h.context.__signedUploadRoute(req({mime:"image/png",size:10,name:"x.png"}),"chat","Alice"),/origem ou rota de upload inesperada/);
}
{
  const h=harness({publicUrl:({bucket,path})=>"https://attacker.example/storage/v1/object/public/"+bucket+"/"+path});
  await assert.rejects(()=>h.context.__signedUploadRoute(req({mime:"image/png",size:10,name:"x.png"}),"chat","Alice"),/URL pública retornada é inválida/);
}
{
  const h=harness();
  const avatar=project+"/storage/v1/object/public/profile-images/"+h.context.__avatarOwnerPrefix(42)+"avatar.png";
  const r=await h.context.__profileRoute(req({avatarUrl:avatar}),"Alice");
  assert.equal(r.status,200);
  assert.equal(r.body.avatarUrl,avatar);
  assert.equal(h.calls.upserts.length,1);
  assert.equal(h.calls.upserts[0].row.avatar_url,avatar);
  assert.equal(h.calls.uploads.length,0);
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
  const r=await h.context.__profileRoute(req({dataUrl:"data:image/png;base64,iVBORw0KGgo="}),"Alice");
  assert.equal(r.status,200);
  assert.equal(h.calls.uploads.length,1);
  assert.equal(h.calls.uploads[0].bucket,"profile-images");
  assert.equal(h.calls.uploads[0].options.contentType,"image/png");
  assert.equal(h.calls.uploads[0].options.upsert,false);
  assert.equal(h.calls.uploads[0].bytes.length,8);
  assert.ok(h.calls.uploads[0].path.startsWith(h.context.__avatarOwnerPrefix(42)));
  assert.ok(r.body.avatarUrl.includes(h.context.__avatarOwnerPrefix(42)));
  assert.equal(h.calls.upserts.length,1);
}
{
  const h=harness();
  await assert.rejects(()=>h.context.__profileRoute(req({dataUrl:"data:image/png;base64,AAAA"}),"Alice"),/Tipo de arquivo não suportado/);
  assert.equal(h.calls.uploads.length,0);
}
{
  const h=harness();
  const r=await h.context.__profileRoute(req({dataUrl:"data:image/jpeg;base64,iVBORw0KGgo="}),"Alice");
  assert.equal(r.status,200);
  assert.equal(h.calls.uploads[0].options.contentType,"image/png");
  assert.ok(h.calls.uploads[0].path.endsWith(".png"));
}
{
  const bytes=Buffer.alloc(2*1024*1024+1);
  Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]).copy(bytes);
  const h=harness();
  const dataUrl="data:image/png;base64,"+bytes.toString("base64");
  await assert.rejects(()=>h.context.__profileRoute(req({dataUrl}),"Alice"),/Arquivo acima do limite permitido/);
  assert.equal(h.calls.uploads.length,0);
}
{
  const h=harness();
  assert.equal(h.context.__uniqueAvatarUserId([{id:42}]),"42");
  assert.equal(h.context.__uniqueAvatarUserId([]),null);
  assert.equal(h.context.__uniqueAvatarUserId([{id:42},{id:43}]),null);
  assert.equal(h.context.__uniqueAvatarUserId([{id:"not-an-id"}]),null);
  assert.equal(h.context.__avatarOwnerPrefix(42),h.context.__avatarOwnerPrefix("42"));
  assert.notEqual(h.context.__avatarOwnerPrefix(42),h.context.__avatarOwnerPrefix(43));
  assert.throws(()=>h.context.__avatarOwnerPrefix("Alice"),/Identidade de usuário inválida/);
}
{
  const h=harness();
  const foreign=project+"/storage/v1/object/public/profile-images/"+h.context.__avatarOwnerPrefix(43)+"avatar.png";
  const r=await h.context.__profileRoute(req({avatarUrl:foreign}),"Alice");
  assert.equal(r.status,403);
  assert.equal(h.calls.upserts.length,0);
}
for(const users of [[],[{id:42,name:"Alice"},{id:43,name:"Alice"}],[{id:"bad",name:"Alice"}]]){
  const h=harness({users});
  const r=await h.context.__profileRoute(req({dataUrl:"data:image/png;base64,iVBORw0KGgo="}),"Alice");
  assert.equal(r.status,409);
  assert.equal(h.calls.uploads.length,0);
}
{
  const h=harness({users:[]});
  const r=await h.context.__profileRoute(req({dataUrl:"data:image/png;base64,AAAA"}),"Alice");
  assert.equal(r.status,409);
  assert.equal(h.calls.uploads.length,0);
}
console.log("PASS signed-upload server validates bucket, path, token, MIME, size, HTTPS origin and profile compatibility.");
