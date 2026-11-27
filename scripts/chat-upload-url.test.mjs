#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const serverTemplate=fs.readFileSync(path.join(ROOT,"src/server/index.template.ts"),"utf8");
function assert(ok,msg){if(!ok)throw new Error("CHAT UPLOAD URL TEST FAILED: "+msg);}

const start=serverTemplate.indexOf("async function chatUploadUrlRoute(req:Request) {");
const end=serverTemplate.indexOf("\nasync function remoteRoute(req:Request,name:string)",start);
assert(start>=0&&end>start,"signed upload handler must exist between media and remote routes");
let handler=serverTemplate.slice(start,end);
handler=handler.replace("async function chatUploadUrlRoute(req:Request) {","async function chatUploadUrlRoute(req) {");
handler=handler.replace("const p:any=await readBody(req);","const p=await readBody(req);");
assert(!handler.includes(":Request")&&!handler.includes(":any"),"handler test extraction must not retain TypeScript annotations");

const uploads=[];
const mimeExtensions={
  "image/png":"png","image/jpeg":"jpg","image/webp":"webp","image/gif":"gif",
  "video/mp4":"mp4","video/webm":"webm",
  "application/pdf":"pdf","application/msword":"doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":"docx",
  "application/vnd.ms-excel":"xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":"xlsx",
  "text/csv":"csv","application/vnd.ms-powerpoint":"ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":"pptx",
  "text/plain":"txt","text/rtf":"rtf","application/rtf":"rtf"
};
const context={
  PROJECT_URL:"https://project-test.supabase.co",
  URL,
  readBody:async req=>req.body,
  ext:mime=>mimeExtensions[mime]||"",
  randomBytes:()=>({toString:()=>"a1b2c3d4e5f6"}),
  response:(body,status=200)=>({body,status}),
  db:{
    storage:{
      from(bucket){
        return {
          createSignedUploadUrl:async filePath=>{
            uploads.push({bucket,filePath});
            return {data:{signedUrl:"/storage/v1/object/upload/sign/"+bucket+"/"+filePath+"?token=test-token",token:"test-token",path:filePath},error:null};
          },
          getPublicUrl:filePath=>({data:{publicUrl:"https://project-test.supabase.co/storage/v1/object/public/"+bucket+"/"+filePath}})
        };
      }
    }
  }
};
vm.createContext(context);
vm.runInContext(handler+"\nthis.chatUploadUrlRoute=chatUploadUrlRoute;",context,{timeout:1000});

const call=(body)=>context.chatUploadUrlRoute({body});
const image=await call({mime:"image/jpeg",size:1024,name:"photo.jpg"});
assert(image.status===200,"valid image upload ticket should be accepted");
assert(image.body.ok===true&&image.body.token==="test-token","image ticket should return upload token");
assert(image.body.bucket==="chat-images"&&image.body.path.endsWith(".jpg"),"image ticket should target chat-images with MIME-derived extension");
assert(image.body.uploadUrl.startsWith("https://project-test.supabase.co/storage/v1/object/upload/sign/chat-images/"),"signed upload URL should be absolute and project-scoped");
assert(image.body.publicUrl.endsWith(image.body.path),"public URL should reference the exact signed object path");
assert(uploads.length===1,"one Storage token should be created for one valid request");

const document=await call({mime:"application/pdf",size:10*1024*1024,name:"manual.pdf"});
assert(document.status===200&&document.body.path.endsWith(".pdf"),"documents at the 10 MB limit should be accepted");
assert(uploads.length===2,"valid document should create exactly one more signed token");

const tooLargeDocument=await call({mime:"application/pdf",size:10*1024*1024+1});
assert(tooLargeDocument.status===413,"documents above 10 MB should be rejected");
const tooLargeMedia=await call({mime:"video/mp4",size:20*1024*1024+1});
assert(tooLargeMedia.status===413,"media above 20 MB should be rejected");
const unsupported=await call({mime:"application/zip",size:1024});
assert(unsupported.status===400,"unsupported MIME types should be rejected");
const invalidSize=await call({mime:"image/png",size:0});
assert(invalidSize.status===400,"empty or invalid sizes should be rejected");
assert(uploads.length===2,"rejected requests must not create Storage upload tokens");

console.log("Signed chat upload URL tests passed: authenticated handler logic, MIME allow-list, size limits, scoped Storage paths, and response URLs.");
