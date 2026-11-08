#!/usr/bin/env node
import fs from "node:fs";
import assert from "node:assert/strict";
import { chromium } from "playwright";

const source=fs.readFileSync("team-lite/upstatus-team-lite.user.js","utf8");
const testOrigin="https://team-lite-invite-smoke.invalid";
const testApi=testOrigin+"/functions/v1/upstatus-team-lite";
let smokeSource=source;
function replaceRuntimeString(name,value){
  const pattern=new RegExp("(var\\s+"+name+"\\s*=\\s*)'[^']*'(?=;)");
  const matches=smokeSource.match(new RegExp(pattern.source,"g"))||[];
  assert.equal(matches.length,1,"expected exactly one runtime config declaration for "+name);
  smokeSource=smokeSource.replace(pattern,(_match,prefix)=>prefix+JSON.stringify(value));
}
replaceRuntimeString("CLOUD_SERVER",testApi);
replaceRuntimeString("UP_REALTIME_URL",testOrigin);
replaceRuntimeString("UP_REALTIME_KEY","test-public-key");
replaceRuntimeString("UP_REALTIME_TOPIC","upstatus-team-lite-invite-smoke");
replaceRuntimeString("UPDATE_URL",testOrigin+"/upstatus-team-lite.user.js");

const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  const pageErrors=[];
  const blockedPageRequests=[];
  page.on("pageerror",error=>pageErrors.push(error.stack||error.message));
  await page.addInitScript(()=>{
    const values=new Map([
      ["upstatus_team_lite_token","inert-admin-session"],
      ["upstatus_team_lite_member","Ricardo"],
      ["upstatus_team_lite_role","implementation_admin"]
    ]);
    window.__upstatusGmWrites=[];
    window.__upstatusGmRequests=[];
    window.__upstatusGmReads=[];
    window.__upstatusGmResponses=[];
    window.__upstatusClipboard=null;
    window.__upstatusRealtimeCreateClientCalls=0;
    window.GM_getValue=(key,fallback)=>{const value=values.has(key)?values.get(key):fallback;window.__upstatusGmReads.push([key,value]);return value;};
    window.GM_setValue=(key,value)=>{values.set(key,value);window.__upstatusGmWrites.push([key,value]);};
    window.GM_setClipboard=(value,type)=>{window.__upstatusClipboard={value,type};};
    window.GM_xmlhttpRequest=options=>{
      const url=String(options.url||"");
      const method=String(options.method||"GET").toUpperCase();
      window.__upstatusGmRequests.push({method,url,data:options.data||""});
      let pathname="";
      try{pathname=new URL(url).pathname;}catch(_){}
      let body={ok:true};
      if(pathname.endsWith("/api/me")){
        body={authenticated:true,name:"Ricardo",role:"implementation_admin",canViewHistory:true};
      }else if(pathname.endsWith("/api/members")){
        body={members:[{name:"Ricardo"},{name:"Guilherme"},{name:"Lohan"}]};
      }else if(pathname.endsWith("/api/status")){
        body={members:{
          Ricardo:{name:"Ricardo",status:"online",version:"3.4.31",connected:true},
          Guilherme:{name:"Guilherme",status:"away",version:"3.4.31",connected:false},
          Lohan:{name:"Lohan",status:"busy",version:"3.4.31",connected:false}
        }};
      }else if(pathname.endsWith("/api/health")){
        body={ok:true,version:"3.4.31",db:{ok:true,ms:2},chat:{ok:true,ms:2},state:{ok:true},members:[{name:"Ricardo",version:"3.4.31",connected:true}]};
      }else if(pathname.endsWith("/api/setup-invite")&&method==="POST"){
        body={name:"Guilherme",setupToken:"a".repeat(64),expiresAt:new Date(Date.now()+15*60*1000).toISOString()};
      }else if(pathname.endsWith("/api/chat")){
        body={messages:[],profiles:{}};
      }else if(pathname.endsWith("/api/profiles")){
        body={profiles:{}};
      }else if(pathname.endsWith("/api/remote-status")){
        body={pending:false};
      }
      const response={status:200,responseText:JSON.stringify(body),responseHeaders:"Content-Type: application/json\\r\\n",finalUrl:url};
      window.__upstatusGmResponses.push({url,status:response.status,body});
      queueMicrotask(()=>{if(typeof options.onload==="function")options.onload(response);});
      return {abort(){if(typeof options.onabort==="function")options.onabort();}};
    };
    const channel={
      on(){return this;},
      subscribe(callback){queueMicrotask(()=>{if(typeof callback==="function")callback("SUBSCRIBED");});return this;},
      send(){return Promise.resolve("ok");},
      unsubscribe(){return Promise.resolve("ok");}
    };
    window.supabase={
      createClient(){
        window.__upstatusRealtimeCreateClientCalls++;
        return {channel(){return channel;},removeAllChannels(){return Promise.resolve();},removeChannel(){return Promise.resolve();}};
      }
    };
    window.GM_openInTab=()=>({close(){}});
  });
  await page.route("**/*",async route=>{
    const request=route.request();
    if(request.isNavigationRequest()){
      return route.fulfill({status:200,contentType:"text/html",body:"<!doctype html><html><head><title>Team Lite invite smoke</title></head><body><div id='app'></div></body></html>"});
    }
    blockedPageRequests.push(request.url());
    return route.abort("blockedbyclient");
  });
  await page.goto("https://www.salesmartly.com/",{waitUntil:"domcontentloaded"});
  await page.addScriptTag({content:smokeSource});
  await page.waitForTimeout(500);
  const initial=await page.evaluate(()=>({rootPresent:!!document.querySelector("#upstatus-team-lite-root"),cardPresent:!!document.querySelector("#upstatus-card"),settingsButtonPresent:!!document.querySelector(".up-settings-btn"),healthButtonPresent:!!document.querySelector(".up-settings-health"),healthButtonCount:document.querySelectorAll(".up-settings-health").length,settingsButtons:Array.from(document.querySelectorAll("button")).filter(b=>String(b.className).includes("settings")).map(b=>({className:b.className,title:b.title,text:b.textContent})),loginButtonPresent:!!document.querySelector("#upstatus-card #up-enter"),cardText:document.querySelector("#upstatus-card")?.innerText?.slice(0,500)||"",requests:window.__upstatusGmRequests,reads:window.__upstatusGmReads,responses:window.__upstatusGmResponses}));
  assert.ok(initial.requests.some(r=>r.url.endsWith("/api/me")),"restored admin session must call /api/me: "+JSON.stringify(initial)+" pageErrors="+pageErrors.join("\\n"));
  assert.ok(initial.settingsButtonPresent,"stored administrator must retain the settings entry: "+JSON.stringify(initial)+" pageErrors="+pageErrors.join("\\n"));
  assert.ok(initial.healthButtonPresent,"restored admin session must render the health action: "+JSON.stringify(initial)+" pageErrors="+pageErrors.join("\\n"));
  await page.evaluate(()=>{
    const settings=document.querySelector(".up-settings-btn");
    const health=document.querySelector(".up-settings-health");
    if(!settings||!health)throw new Error("stored administrator settings controls are missing");
    settings.click();
    health.click();
  });
  await page.locator(".up-health .up-setup-invite").waitFor({timeout:5000});
  await page.locator(".up-setup-invite summary").click();
  await page.locator(".up-setup-invite-name").fill("Guilherme");
  await page.locator(".up-setup-invite-generate").click();
  await page.waitForFunction(()=>!!window.__upstatusClipboard,{timeout:5000});

  const result=await page.evaluate(()=>{
    const token=window.__upstatusClipboard&&window.__upstatusClipboard.value;
    const requests=window.__upstatusGmRequests;
    const invite=requests.find(r=>r.url.endsWith("/api/setup-invite"));
    const status=document.querySelector(".up-setup-invite-status");
    const root=document.querySelector("#upstatus-team-lite-root");
    return {
      clipboard:window.__upstatusClipboard,
      invite:invite?{method:invite.method,data:invite.data}:null,
      status:status?status.textContent:"",
      rootHtml:root?root.innerHTML:"",
      gmWrites:window.__upstatusGmWrites,
      gmHosts:requests.map(r=>new URL(r.url).hostname),
      realtimeCalls:window.__upstatusRealtimeCreateClientCalls,
      token
    };
  });
  assert.ok(result.clipboard,"admin action must write the one-time token to the userscript clipboard");
  assert.equal(result.clipboard.type,"text");
  assert.equal(result.clipboard.value,"a".repeat(64));
  assert.ok(result.invite,"admin action must call the setup-invite endpoint");
  assert.equal(result.invite.method,"POST");
  assert.equal(JSON.parse(result.invite.data).name,"Guilherme");
  assert.match(result.status,/Código copiado/);
  assert.ok(!result.rootHtml.includes("a".repeat(64)),"raw setup token must not be rendered into page DOM");
  assert.ok(!result.gmWrites.some(([key,value])=>String(key).toLowerCase().includes("setup")||String(value).includes("a".repeat(64))),"raw setup token must not be persisted in Tampermonkey storage");
  assert.ok(result.gmHosts.every(host=>host==="team-lite-invite-smoke.invalid"),"all GM API traffic must remain on the inert test host");
  assert.ok(blockedPageRequests.every(url=>!url.includes("dlfvkawaiqduhlazsszm")),"browser smoke must not send page-world requests to production Supabase");
  assert.equal(pageErrors.length,0,"authenticated Team Lite invite UI must not throw: "+pageErrors.join("\\n"));
  console.log("PASS authenticated Team Lite IIFE opens the admin invite panel, calls only the inert setup-invite endpoint, copies the token, and never renders or persists it.");

  // Full-IIFE ordinary-user regression: Team Lite keeps the minimal UI and cannot open admin health/invite controls.
  const userPage=await browser.newPage({viewport:{width:1280,height:900}});
  const userPageErrors=[];
  const userBlockedPageRequests=[];
  userPage.on("pageerror",error=>userPageErrors.push(error.stack||error.message));
  await userPage.addInitScript(()=>{
    const values=new Map([
      ["upstatus_team_lite_token","inert-user-session"],
      ["upstatus_team_lite_member","Guilherme"],
      ["upstatus_team_lite_role","implementation_user"]
    ]);
    window.__upstatusUserGmWrites=[];
    window.__upstatusUserGmRequests=[];
    window.__upstatusUserClipboard=null;
    window.__upstatusUserRealtimeCalls=0;
    window.GM_getValue=(key,fallback)=>values.has(key)?values.get(key):fallback;
    window.GM_setValue=(key,value)=>{values.set(key,value);window.__upstatusUserGmWrites.push([key,value]);};
    window.GM_setClipboard=(value,type)=>{window.__upstatusUserClipboard={value,type};};
    window.GM_xmlhttpRequest=options=>{
      const url=String(options.url||"");
      const method=String(options.method||"GET").toUpperCase();
      window.__upstatusUserGmRequests.push({method,url,data:options.data||""});
      let pathname="";
      try{pathname=new URL(url).pathname;}catch(_){}
      let body={ok:true};
      if(pathname.endsWith("/api/me")){
        body={authenticated:true,name:"Guilherme",role:"implementation_user",canViewHistory:false};
      }else if(pathname.endsWith("/api/members")){
        body={members:[{name:"Ricardo"},{name:"Guilherme"},{name:"Lohan"}]};
      }else if(pathname.endsWith("/api/status")){
        body={members:{
          Ricardo:{name:"Ricardo",status:"online",version:"3.4.31",connected:true},
          Guilherme:{name:"Guilherme",status:"away",version:"3.4.31",connected:true},
          Lohan:{name:"Lohan",status:"busy",version:"3.4.31",connected:false}
        }};
      }else if(pathname.endsWith("/api/chat")){
        body={messages:[],profiles:{}};
      }else if(pathname.endsWith("/api/profiles")){
        body={profiles:{}};
      }else if(pathname.endsWith("/api/remote-status")){
        body={pending:false};
      }else if(pathname.endsWith("/api/health")){
        body={ok:true,version:"3.4.31",db:{ok:true,ms:2},chat:{ok:true,ms:2},state:{ok:true},members:[]};
      }else if(pathname.endsWith("/api/setup-invite")&&method==="POST"){
        body={name:"Guilherme",setupToken:"b".repeat(64),expiresAt:new Date(Date.now()+15*60*1000).toISOString()};
      }
      const response={status:200,responseText:JSON.stringify(body),responseHeaders:"Content-Type: application/json\\r\\n",finalUrl:url};
      queueMicrotask(()=>{if(typeof options.onload==="function")options.onload(response);});
      return {abort(){if(typeof options.onabort==="function")options.onabort();}};
    };
    const channel={
      on(){return this;},
      subscribe(callback){queueMicrotask(()=>{if(typeof callback==="function")callback("SUBSCRIBED");});return this;},
      send(){return Promise.resolve("ok");},
      unsubscribe(){return Promise.resolve("ok");}
    };
    window.supabase={
      createClient(){
        window.__upstatusUserRealtimeCalls++;
        return {channel(){return channel;},removeAllChannels(){return Promise.resolve();},removeChannel(){return Promise.resolve();}};
      }
    };
    window.GM_openInTab=()=>({close(){}});
  });
  await userPage.route("**/*",async route=>{
    const request=route.request();
    if(request.isNavigationRequest()){
      return route.fulfill({status:200,contentType:"text/html",body:"<!doctype html><html><head><title>Team Lite ordinary-user smoke</title></head><body><div id='app'></div></body></html>"});
    }
    userBlockedPageRequests.push(request.url());
    return route.abort("blockedbyclient");
  });
  await userPage.goto("https://www.salesmartly.com/",{waitUntil:"domcontentloaded"});
  await userPage.addScriptTag({content:smokeSource});
  await userPage.waitForTimeout(500);
  const ordinary=await userPage.evaluate(()=>({
    rootPresent:!!document.querySelector("#upstatus-team-lite-root"),
    cardPresent:!!document.querySelector("#upstatus-card"),
    settingsButtonPresent:!!document.querySelector(".up-settings-btn"),
    settingsMenuVisible:!!document.querySelector(".up-settings-menu:not(.hidden)"),
    healthPanelVisible:!!document.querySelector(".up-health:not(.hidden)"),
    invitePanelPresent:!!document.querySelector(".up-setup-invite"),
    requests:window.__upstatusUserGmRequests,
    writes:window.__upstatusUserGmWrites,
    clipboard:window.__upstatusUserClipboard,
    realtimeCalls:window.__upstatusUserRealtimeCalls,
    loginButtonPresent:!!document.querySelector("#upstatus-card #up-enter")
  }));
  assert.ok(ordinary.rootPresent&&ordinary.cardPresent,"ordinary Team Lite user must retain the minimal authenticated panel: "+JSON.stringify(ordinary)+" pageErrors="+userPageErrors.join("\\n"));
  assert.equal(ordinary.loginButtonPresent,false,"ordinary user session must remain authenticated");
  assert.ok(ordinary.requests.some(r=>r.url.endsWith("/api/me")),"ordinary-user Full-IIFE must validate its restored session");
  assert.equal(ordinary.settingsButtonPresent,false,"ordinary Team Lite user must not receive the admin settings entry");
  assert.equal(ordinary.settingsMenuVisible,false,"ordinary Team Lite user must not open the settings menu");
  assert.equal(ordinary.healthPanelVisible,false,"ordinary Team Lite user must not open system health");
  assert.equal(ordinary.invitePanelPresent,false,"ordinary Team Lite user must not receive the setup-invite panel");
  assert.ok(!ordinary.requests.some(r=>r.url.endsWith("/api/setup-invite")),"ordinary user must not call setup-invite");
  assert.ok(!ordinary.requests.some(r=>r.url.endsWith("/api/health")),"ordinary user must not call admin health");
  assert.equal(ordinary.clipboard,null,"ordinary user must not write an invite token to clipboard");

  assert.ok(ordinary.requests.every(r=>new URL(r.url).hostname==="team-lite-invite-smoke.invalid"),"ordinary user's GM traffic must remain on the inert test host");
  assert.ok(userBlockedPageRequests.every(url=>!url.includes("dlfvkawaiqduhlazsszm")),"ordinary-user browser smoke must not send page-world requests to production Supabase");
  assert.equal(userPageErrors.length,0,"ordinary Team Lite IIFE must not throw: "+userPageErrors.join("\\n"));
  // Defense in depth: even a synthetic click on the hidden health entry must be rejected by openHealth().
  await userPage.evaluate(()=>document.querySelector(".up-settings-health")?.click());
  await userPage.waitForTimeout(50);
  const afterSyntheticClick=await userPage.evaluate(()=>({
    healthPanelVisible:!!document.querySelector(".up-health:not(.hidden)"),
    invitePanelPresent:!!document.querySelector(".up-setup-invite")
  }));
  assert.equal(afterSyntheticClick.healthPanelVisible,false,"openHealth must enforce the stored role even for a synthetic hidden-button click");
  assert.equal(afterSyntheticClick.invitePanelPresent,false,"synthetic hidden-button click must not create the invite panel");
  assert.ok(!userPageErrors.length,"ordinary-user synthetic click must not throw");
  console.log("PASS Team Lite ordinary-user Full-IIFE keeps the minimal UI, hides admin settings, rejects synthetic health access, and never calls setup-invite or copies a token.");

}finally{
  await browser.close();
}
