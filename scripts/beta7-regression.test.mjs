#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const user=fs.readFileSync(path.join(ROOT,"dist/upstatus-screen-share-beta7.user.js"),"utf8");
function assert(ok,msg){if(!ok)throw new Error("BETA7 REGRESSION FAILED: "+msg);}
function header(name){const m=user.match(new RegExp("^// @"+name+"\\s+(.+)$","m"));return m?m[1].trim():"";}
assert(header("version")==="3.1.1-beta7","version metadata must be beta7");
assert(header("namespace")==="upseller-screen-share-beta7","namespace must be isolated");
assert(header("updateURL").includes("/upstatus-screen-share-3-1-1-beta7/upstatus.user.js"),"update URL must target beta7");
assert(header("downloadURL").includes("/upstatus-screen-share-3-1-1-beta7/upstatus.user.js"),"download URL must target beta7");
assert(user.includes("upstatus-screen-share-live-3-1-1-beta7"),"Realtime topic must be isolated");
assert(user.includes("upstatus_screen_signal_3_1_1_beta7"),"screen signaling event must be isolated");
assert(user.includes("upstatus_screen_share_beta7_"),"storage prefix must be isolated");
assert(user.includes("#upstatus-bubble{visibility:visible!important;opacity:1!important;pointer-events:auto!important}"),"bubble visibility regression guard missing");
assert(user.includes(".up-voice-room.is-joined .up-voice-actions{position:static!important"),"joined call controls must be in compact row layout");
assert(user.includes("chip.title=n")&&user.includes("chip.setAttribute('aria-label',n)"),"participant names must remain accessible via tooltip/aria-label");
assert(user.includes("p.audio.muted=!!voiceRoom.speakersMuted"),"new remote audio elements must respect local received-audio mute");
assert(user.includes("getDisplayMedia({video:{frameRate:{ideal:15,max:24}},audio:false})"),"screen capture must keep audio disabled");
assert(user.includes("function screenShareOpenViewer")&&user.includes("backdrop-filter:blur(14px)"),"custom blurred viewer modal must exist");
assert(user.includes("previousFocus.focus({preventScroll:true})"),"modal must restore focus");
assert(user.includes("e.key==='Escape'")&&user.includes("e.target===overlay"),"modal must close on Escape and outside click");
assert(!user.includes("requestFullscreen"),"custom viewer must not rely on native fullscreen");
console.log("UpStatus beta7 static regression checks passed.");
