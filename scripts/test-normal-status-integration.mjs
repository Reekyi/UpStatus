import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { createHttpHelpers } from "../src/server/normal-3.4.7/modules/http.js";
import { createStatusHandlers } from "../src/server/normal-3.4.7/modules/status.js";
import { createRemoteStatusHandler } from "../src/server/normal-3.4.7/modules/remote-status.js";

function memoryDb() {
  const tables = {
    users: [
      { name: "Ricardo", status: "offline", reason: "", sync: "ok" },
      { name: "Guilherme", status: "offline", reason: "", sync: "ok" },
      { name: "Lohan", status: "offline", reason: "", sync: "ok" }
    ],
    messages: [],
    upstatus_state: [],
    status_history: []
  };
  const db = { tables, from(table) {
    const q = { filters: [], action: "select", payload: null, orderBy: null, limitValue: null };
    const rows = () => tables[table] || [];
    const selected = () => rows().filter(row => q.filters.every(([op, key, value]) => {
      if (op === "eq") return row[key] === value;
      if (op === "in") return value.includes(row[key]);
      return true;
    }));
    const b = {
      select() { q.action = "select"; return this; },
      eq(key,value) { q.filters.push(["eq",key,value]); return this; },
      in(key,value) { q.filters.push(["in",key,value]); return this; },
      order(key,opts={}) { q.orderBy=[key,opts]; return this; },
      limit(value) { q.limitValue=value; return this; },
      update(payload) { q.action="update"; q.payload=payload; return this; },
      insert(payload) { rows().push(structuredClone(payload)); return Promise.resolve({ error:null }); },
      then(resolve,reject) {
        let data;
        if(q.action==="update") {
          for(const row of selected()) Object.assign(row,structuredClone(q.payload));
          data=null;
        } else {
          data=selected().map(x=>({...x}));
          if(q.orderBy) {
            const [key,opts]=q.orderBy;
            data.sort((a,b)=>String(a[key]||"").localeCompare(String(b[key]||""))*(opts.ascending===false?-1:1));
          }
          if(q.limitValue!=null) data=data.slice(0,q.limitValue);
        }
        return Promise.resolve({data,error:null}).then(resolve,reject);
      }
    };
    return b;
  }};
  return db;
}
const db=memoryDb();
const {response,readBody}=createHttpHelpers({});
const account=async name=>db.tables.users.find(x=>x.name===name)||null;
const admin=async name=>name==="Ricardo";
const status=createStatusHandlers({db,response,readBody,account,admin,version:"3.4.7"});
let remoteState={commands:{},results:{}};
const remote=createRemoteStatusHandler({
  stateValue:async()=>remoteState,
  setState:async(key,value)=>{assert.equal(key,"remote-status");remoteState=structuredClone(value);},
  admin,response,readBody,
  members:async()=>[{name:"Ricardo"},{name:"Guilherme"},{name:"Lohan"}],
  randomBytes:()=>Buffer.from("0123456789")
});
const post=(url,body)=>new Request("https://upstatus.test"+url,{
  method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)
});

{
  const changed=await status.statusRoute(post("/api/status",{status:"busy",reason:"Reunião"}),"Guilherme");
  const body=await changed.json();
  assert.equal(changed.status,200);
  assert.equal(body.status,"busy");
  assert.equal(db.tables.status_history.length,1);
  assert.equal(db.tables.status_history[0].user_name,"Guilherme");
  assert.equal(db.tables.status_history[0].actor,"Guilherme");
}
{
  const current=await status.statusRoute(new Request("https://upstatus.test/api/status"),"Guilherme");
  const body=await current.json();
  assert.equal(body.members.Guilherme.status,"busy");
  assert.equal(body.members.Guilherme.sync,"ok");
  const history=await status.historyRoute(new Request("https://upstatus.test/api/history?limit=10"),"Ricardo");
  assert.equal((await history.json()).history.length,1);
}
{
  const command=await remote.remoteRoute(post("/api/remote-status",{
    target:"Guilherme",status:"away",reason:"Pausa"
  }),"Ricardo");
  const body=await command.json();
  assert.equal(command.status,200);
  assert.equal(body.command.target,"Guilherme");
  const pending=await remote.remoteRoute(new Request("https://upstatus.test/api/remote-status"),"Guilherme");
  assert.equal((await pending.json()).pending,true);
  const ack=await remote.remoteRoute(post("/api/remote-status/result",{commandId:body.commandId,ok:true}),"Guilherme");
  assert.deepEqual(await ack.json(),{ok:true});
  assert.equal(remoteState.commands.Guilherme,undefined);
  assert.equal(remoteState.results[body.commandId].ok,true);
  const result=await remote.remoteRoute(new Request("https://upstatus.test/api/remote-status/result?id="+body.commandId),"Ricardo");
  assert.equal((await result.json()).ready,true);
}
{
  const health=await status.healthRoute(new Request("https://upstatus.test/api/health"),"Ricardo");
  const body=await health.json();
  assert.equal(health.status,200);
  assert.equal(body.ok,true);
  assert.equal(body.service,"UpStatus");
  assert.equal(body.members.length,3);
}
console.log("PASS: integrated status, history, health and remote command lifecycle");
