import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source=fs.readFileSync("src/userscript/upstatus.user.template.js","utf8");
const mimeStart=source.indexOf("  function fileMimeFromExt(");
const mimeEnd=source.indexOf("  function fileToDataUrl(",mimeStart);
const uploadStart=source.indexOf("  function uploadFileDirect(file,route){",mimeEnd);
const uploadEnd=source.indexOf("  function sendChatMedia(",uploadStart);
assert.ok(mimeStart>=0&&mimeEnd>mimeStart,"file MIME resolver block is missing");
assert.ok(uploadStart>=0&&uploadEnd>uploadStart,"signed upload helper block is missing");

const mimeSource=source.slice(mimeStart,mimeEnd);
const uploadSource=source.slice(uploadStart,uploadEnd);
const origin="https://test-project.supabase.co";

function ticketFor({bucket="chat-images",path="20261107-file.png",mime="image/png",size=123,token="one-time-upload-token",uploadTokenInUrl=true,uploadOrigin=origin,publicOrigin=origin}={}){
  const query=uploadTokenInUrl?"?token="+encodeURIComponent(token):"";
  return {
    uploadUrl:uploadOrigin+"/storage/v1/object/upload/sign/"+bucket+"/"+path+query,
    publicUrl:publicOrigin+"/storage/v1/object/public/"+bucket+"/"+path,
    token,path,bucket,mime,size
  };
}
function harness(ticket,fetchResponse={ok:true,status:200},baseOrigin=origin){
  const calls={api:[],fetch:[]};
  const context=vm.createContext({
    UP_REALTIME_URL:baseOrigin,
    api:(method,route,payload)=>{calls.api.push({method,route,payload});return Promise.resolve(typeof ticket==="function"?ticket(method,route,payload):ticket);},
    fetch:(url,options)=>{calls.fetch.push({url:String(url),options});return Promise.resolve(fetchResponse);},
    URL,Promise,Error,String,Number,RegExp,Math,decodeURIComponent
  });
  vm.runInContext(mimeSource+"\n"+uploadSource+"\nglobalThis.__uploadFileDirect=uploadFileDirect;",context);
  return {uploadFileDirect:context.__uploadFileDirect,calls};
}
const imageFile={name:"photo.png",type:"image/png",size:123};
const validTicket=ticketFor();
{
  const h=harness(validTicket);
  const result=await h.uploadFileDirect(imageFile,"/api/chat/upload-url");
  assert.equal(result.publicUrl,validTicket.publicUrl);
  assert.equal(result.path,validTicket.path);
  assert.equal(result.bucket,"chat-images");
  assert.equal(h.calls.api.length,1);
  assert.equal(h.calls.api[0].method,"POST");
  assert.equal(h.calls.api[0].route,"/api/chat/upload-url");
  assert.equal(h.calls.api[0].payload.mime,"image/png");
  assert.equal(h.calls.api[0].payload.size,123);
  assert.equal(h.calls.api[0].payload.name,"photo.png");
  assert.equal(h.calls.fetch.length,1);
  assert.equal(h.calls.fetch[0].options.method,"PUT");
  assert.equal(h.calls.fetch[0].options.credentials,"omit");
  assert.equal(h.calls.fetch[0].options.redirect,"error");
  assert.equal(h.calls.fetch[0].options.headers["Content-Type"],"image/png");
  assert.equal(h.calls.fetch[0].options.headers["x-upsert"],"true");
  assert.equal("authorization" in h.calls.fetch[0].options.headers,false);
  assert.equal(new URL(h.calls.fetch[0].url).searchParams.get("token"),validTicket.token);
}
{
  const noQuery=ticketFor({uploadTokenInUrl:false});
  const h=harness(noQuery);
  await h.uploadFileDirect(imageFile,"/api/chat/upload-url");
  assert.equal(new URL(h.calls.fetch[0].url).searchParams.get("token"),noQuery.token);
}
{
  const avatarTicket=ticketFor({bucket:"profile-images",path:"avatar.png"});
  const h=harness(avatarTicket);
  const result=await h.uploadFileDirect(imageFile,"/api/profile/avatar-upload-url");
  assert.equal(result.bucket,"profile-images");
  assert.equal(h.calls.api[0].route,"/api/profile/avatar-upload-url");
}
{
  const h=harness(validTicket);
  await assert.rejects(()=>h.uploadFileDirect({name:"bad.zip",type:"application/zip",size:123},"/api/chat/upload-url"),/Tipo de arquivo/);
  assert.equal(h.calls.api.length,0);
  await assert.rejects(()=>h.uploadFileDirect({name:"large.png",type:"image/png",size:20*1024*1024+1},"/api/chat/upload-url"),/20 MB/);
  assert.equal(h.calls.api.length,0);
  await assert.rejects(()=>h.uploadFileDirect({name:"clip.mp4",type:"video/mp4",size:123},"/api/profile/avatar-upload-url"),/Tipo de arquivo/);
  assert.equal(h.calls.api.length,0);
  await assert.rejects(()=>h.uploadFileDirect(imageFile,"/api/other/upload"),/Rota de upload/);
  assert.equal(h.calls.api.length,0);
}
{
  const h=harness(ticketFor({uploadOrigin:"https://attacker.example"}));
  await assert.rejects(()=>h.uploadFileDirect(imageFile,"/api/chat/upload-url"),/origem inesperada/);
  assert.equal(h.calls.fetch.length,0);
}
{
  const h=harness(ticketFor({publicOrigin:"https://attacker.example"}));
  await assert.rejects(()=>h.uploadFileDirect(imageFile,"/api/chat/upload-url"),/origem inesperada/);
  assert.equal(h.calls.fetch.length,0);
}
{
  const badUserInfo=ticketFor();
  badUserInfo.uploadUrl=badUserInfo.uploadUrl.replace("https://","https://user:pass@");
  const h=harness(badUserInfo);
  await assert.rejects(()=>h.uploadFileDirect(imageFile,"/api/chat/upload-url"),/origem inesperada/);
  assert.equal(h.calls.fetch.length,0);
}
{
  const badFragment=ticketFor();
  badFragment.uploadUrl+="#fragment";
  const h=harness(badFragment);
  await assert.rejects(()=>h.uploadFileDirect(imageFile,"/api/chat/upload-url"),/origem inesperada/);
  assert.equal(h.calls.fetch.length,0);
}
{
  const h=harness(validTicket,{ok:true,status:200},"http://test-project.supabase.co");
  await assert.rejects(()=>h.uploadFileDirect(imageFile,"/api/chat/upload-url"),/URL de upload inválida/);
  assert.equal(h.calls.fetch.length,0);
}
{
  const incomplete=ticketFor();
  delete incomplete.uploadUrl;
  const h=harness(incomplete);
  await assert.rejects(()=>h.uploadFileDirect(imageFile,"/api/chat/upload-url"),/Resposta de autorização incompleta/);
  assert.equal(h.calls.fetch.length,0);
}
{
  const videoFile={name:"clip.mp4",type:"video/mp4",size:456};
  const videoTicket=ticketFor({mime:"video/mp4",path:"20261109-clip.mp4",size:456});
  const h=harness(videoTicket);
  const result=await h.uploadFileDirect(videoFile,"/api/chat/upload-url");
  assert.equal(result.mime,"video/mp4");
  assert.equal(result.bucket,"chat-images");
  assert.equal(h.calls.fetch.length,1);
  assert.equal(h.calls.fetch[0].options.method,"PUT");
}

{
  const h=harness(ticketFor({bucket:"profile-images"}));
  await assert.rejects(()=>h.uploadFileDirect(imageFile,"/api/chat/upload-url"),/incompleta/);
  assert.equal(h.calls.fetch.length,0);
}
{
  const badPath=ticketFor();
  badPath.uploadUrl=badPath.uploadUrl.replace("20261107-file.png","other-file.png");
  const h=harness(badPath);
  await assert.rejects(()=>h.uploadFileDirect(imageFile,"/api/chat/upload-url"),/caminho assinado/);
  assert.equal(h.calls.fetch.length,0);
}
{
  const badToken=ticketFor();
  badToken.uploadUrl=badToken.uploadUrl.replace("one-time-upload-token","wrong-token");
  const h=harness(badToken);
  await assert.rejects(()=>h.uploadFileDirect(imageFile,"/api/chat/upload-url"),/token da URL assinada/);
  assert.equal(h.calls.fetch.length,0);
}
{
  const noToken=ticketFor({token:""});
  const h=harness(noToken);
  await assert.rejects(()=>h.uploadFileDirect(imageFile,"/api/chat/upload-url"),/incompleta/);
  assert.equal(h.calls.fetch.length,0);
}
{
  const h=harness(validTicket,{ok:false,status:403});
  await assert.rejects(()=>h.uploadFileDirect(imageFile,"/api/chat/upload-url"),/Storage \(403\)/);
}
assert.ok(source.includes("uploadFileDirect(file,'/api/chat/upload-url')"),"chat UI must use signed uploads");
assert.ok(source.includes("uploadFileDirect(file,'/api/profile/avatar-upload-url')"),"avatar UI must use signed uploads");
assert.ok(!source.includes("api('POST','/api/chat/image',{dataUrl:dataUrl})"),"chat image UI must not send base64 payloads after signed-upload cutover");
assert.ok(!source.includes("fileToDataUrl(file).then(function(data){return api('POST','/api/profile/avatar',{dataUrl:data});})"),"avatar save UI must not send base64 payloads after signed-upload cutover");

console.log("PASS signed-upload client validates route, bucket, MIME, size, project origin, object path, one-time token, PUT contract, and UI wiring.");
