require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');
const { spawnSync } = require('child_process');

const PORT = Number(process.env.PORT || 3030);
const HTTPS_PORT = Number(process.env.HTTPS_PORT || 3443);
const TLS_KEY_FILE = path.join(__dirname, 'tls', 'server.key');
const TLS_CERT_FILE = path.join(__dirname, 'tls', 'server.crt');
const ROOT = __dirname;
const DATA_FILE = path.join(ROOT, 'status-data.json');
const HISTORY_FILE = path.join(ROOT, 'history-data.json');
const USERS_FILE = path.join(ROOT, 'users.json');
const CHAT_FILE = path.join(ROOT, 'chat-data.json');
const CHAT_READ_FILE = path.join(ROOT, 'chat-read.json');
const REMOTE_STATUS_FILE = path.join(ROOT, 'remote-status-data.json');
const CHAT_IMAGES_DIR = path.join(ROOT, 'chat-images');
const PROFILE_FILE = path.join(ROOT, 'profile-data.json');
const PROFILE_IMAGES_DIR = path.join(ROOT, 'profile-images');
const LUCCA_PASSWORD = '0666';
const LUCCA_TIMEOUT_MS = 12000;
const LUCCA_FILE = path.join(ROOT, 'lucca-data.json');
const CURRENT_VERSION = '2.7.2';
const UPDATE_SCRIPT_FILE = path.join(ROOT, 'upstatus.user.js');
const sessions = new Map();
const chatTyping = new Map();

function readLucca() {
  const data = readJson(LUCCA_FILE, {});
  return data && typeof data === 'object' ? data : {};
}

function writeLucca(data) {
  fs.writeFileSync(LUCCA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function luccaPresence() {
  const data = readLucca();
  return { online: !!data.online, joinedAt: data.joinedAt || null, session: data.session || null, lastSeen: data.lastSeen || null };
}

function appendChatSystemEvent(systemType, message) {
  const messages = cleanupChatAndReturn();
  messages.push({
    id: crypto.randomBytes(8).toString('hex'),
    user: 'Sistema',
    message,
    type: 'system',
    systemType,
    imageUrl: '',
    mentions: [],
    replyTo: null,
    reactions: {},
    createdAt: new Date().toISOString()
  });
  writeChat(messages);
}

function expireLuccaIfNeeded() {
  const data = readLucca();
  if (!data.online || !data.lastSeen) return data;
  if (Date.now() - Date.parse(data.lastSeen) < LUCCA_TIMEOUT_MS) return data;
  data.online = false;
  data.lastSeen = new Date().toISOString();
  data.session = null;
  writeLucca(data);
  chatTyping.delete('Lucca');
  appendChatSystemEvent('lucca_leave', '🔴 Lucca Maluco saiu do chat.');
  return data;
}

function guestSession(req) {
  expireLuccaIfNeeded();
  const token = (req.headers.cookie || '').split(';').map(x => x.trim()).find(x => x.startsWith('lucca_session='));
  const value = token ? token.split('=')[1] : null;
  const data = readLucca();
  if (!value || !data.online || !data.session || value !== data.session) return null;
  return data;
}

function currentChatContext(req) {
  const normal = currentUser(req);
  if (normal) return { name: normal, guest: false, joinedAt: 0 };
  const guest = guestSession(req);
  if (guest) return { name: 'Lucca', guest: true, joinedAt: Date.parse(guest.joinedAt) || Date.now() };
  return null;
}

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return fallback; }
}

function users() {
  const data = readJson(USERS_FILE, {});
  return data && typeof data === 'object' ? data : {};
}

function teamNames() {
  return Object.keys(users());
}

function saveUsers(data) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function defaultData() {
  return {
    members: Object.fromEntries(teamNames().map(name => [name, {
      name,
      status: 'offline',
      reason: '',
      updatedAt: null,
      sync: 'not_configured'
    }]))
  };
}

function readData() {
  const base = defaultData();
  const current = readJson(DATA_FILE, {});
  const members = { ...base.members, ...(current.members || {}) };

  for (const name of teamNames()) {
    members[name] = {
      ...base.members[name],
      ...(members[name] || {}),
      name
    };
  }

  return { members };
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function readHistory() {
  const data = readJson(HISTORY_FILE, []);
  return Array.isArray(data) ? data : [];
}

function writeHistory(data) {
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(data.slice(-2000), null, 2), 'utf8');
}

function readChat() {
  const data = readJson(CHAT_FILE, []);
  return Array.isArray(data) ? data : [];
}

function writeChat(data) {
  const cutoff = Date.now() - 48 * 60 * 60 * 1000;
  const clean = data.filter(x => x && x.createdAt && Date.parse(x.createdAt) >= cutoff).slice(-1000);
  fs.writeFileSync(CHAT_FILE, JSON.stringify(clean, null, 2), 'utf8');
  return clean;
}

function ensureChatImagesDir() {
  if (!fs.existsSync(CHAT_IMAGES_DIR)) fs.mkdirSync(CHAT_IMAGES_DIR, { recursive: true });
}

function cleanupChatImages(messages) {
  ensureChatImagesDir();
  const referenced = new Set(
    messages.filter(m => m && (m.type === 'image' || m.type === 'video' || m.type === 'audio') && m.imageUrl).map(m => path.basename(m.imageUrl))
  );
  const cutoff = Date.now() - 48 * 60 * 60 * 1000;
  for (const file of fs.readdirSync(CHAT_IMAGES_DIR)) {
    if (referenced.has(file)) continue;
    try {
      const stat = fs.statSync(path.join(CHAT_IMAGES_DIR, file));
      if (stat.mtimeMs < cutoff) fs.unlinkSync(path.join(CHAT_IMAGES_DIR, file));
    } catch {}
  }
}

function saveChatMedia(dataUrl) {
  const match = String(dataUrl || '').match(/^data:(image\/(?:png|jpeg|jpg|webp|gif)|video\/(?:mp4|webm|quicktime)|audio\/(?:webm|ogg|mp4|mpeg));base64,([A-Za-z0-9+/=\s]+)$/i);
  if (!match) throw new Error('Arquivo inválido. Use PNG, JPG, WEBP, GIF, MP4, WEBM ou áudio.');
  const mime = match[1].toLowerCase().replace('image/jpg', 'image/jpeg').replace('video/quicktime', 'video/mp4');
  const buffer = Buffer.from(match[2].replace(/\s/g, ''), 'base64');
  const max = mime.startsWith('video/') ? 25 * 1024 * 1024 : 5 * 1024 * 1024;
  if (!buffer.length || buffer.length > max) throw new Error(`O ${mime.startsWith('video/') ? 'vídeo' : 'arquivo'} deve ter no máximo ${max / 1024 / 1024} MB.`);
  const extMap = {'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif','video/mp4':'mp4','video/webm':'webm','audio/webm':'webm','audio/ogg':'ogg','audio/mp4':'m4a','audio/mpeg':'mp3','audio/wav':'wav','audio/x-wav':'wav'};
  const ext = extMap[mime];
  if (!ext) throw new Error('Tipo de arquivo não suportado.');
  ensureChatImagesDir();
  const filename = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${ext}`;
  fs.writeFileSync(path.join(CHAT_IMAGES_DIR, filename), buffer);
  return { url: `/chat-images/${filename}`, type: mime.startsWith('video/') ? 'video' : (mime.startsWith('audio/') ? 'audio' : 'image') };
}

function ffmpegCommand() {
  const local = path.join(ROOT, process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');
  if (fs.existsSync(local)) return local;
  return process.env.FFMPEG_PATH || 'ffmpeg';
}

function saveChatAudio(dataUrl) {
  const raw = String(dataUrl || '');
  const match = raw.match(/^data:(audio\/[A-Za-z0-9.+-]+)(?:;[^,]*)?;base64,([A-Za-z0-9+/=\s]+)$/i);
  if (!match) throw new Error('Áudio inválido.');
  const mime = String(match[1] || '').toLowerCase();
  const buffer = Buffer.from(match[2].replace(/\s/g, ''), 'base64');
  if (!buffer.length || buffer.length > 5 * 1024 * 1024) throw new Error('O áudio deve ter no máximo 5 MB.');
  ensureChatImagesDir();
  if (mime === 'audio/mpeg' || mime === 'audio/mp3') {
    const filename = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.mp3`;
    fs.writeFileSync(path.join(CHAT_IMAGES_DIR, filename), buffer);
    return { url: `/chat-images/${filename}`, type: 'audio', format: 'mp3' };
  }
  const base = `upstatus-audio-${Date.now()}-${crypto.randomBytes(5).toString('hex')}`;
  const ext = mime === 'audio/ogg' || mime === 'audio/opus' ? 'ogg' : mime === 'audio/mp4' || mime === 'audio/x-m4a' ? 'm4a' : mime === 'audio/wav' || mime === 'audio/x-wav' ? 'wav' : 'webm';
  const input = path.join(os.tmpdir(), `${base}.${ext}`);
  const output = path.join(CHAT_IMAGES_DIR, `${base}.mp3`);
  fs.writeFileSync(input, buffer);
  try {
    const result = spawnSync(ffmpegCommand(), ['-y','-loglevel','error','-i',input,'-vn','-ac','1','-ar','44100','-b:a','128k',output], { encoding: 'utf8', windowsHide: true });
    if (!result.error && result.status === 0 && fs.existsSync(output)) return { url: `/chat-images/${path.basename(output)}`, type: 'audio', format: 'mp3' };
  } catch {}
  try { if (fs.existsSync(output)) fs.unlinkSync(output); } catch {}
  const extMap = {'audio/webm':'webm','audio/ogg':'ogg','audio/opus':'ogg','audio/mp4':'m4a','audio/x-m4a':'m4a','audio/wav':'wav','audio/x-wav':'wav'};
  const fallbackExt = extMap[mime] || 'webm';
  const filename = `${base}.${fallbackExt}`;
  fs.writeFileSync(path.join(CHAT_IMAGES_DIR, filename), buffer);
  try { if (fs.existsSync(input)) fs.unlinkSync(input); } catch {}
  return { url: `/chat-images/${filename}`, type: 'audio', format: fallbackExt };
}

function saveChatImage(dataUrl) { return saveChatMedia(dataUrl).url; }

function readChatRead() {
  const data = readJson(CHAT_READ_FILE, {});
  if (!data || typeof data !== 'object') return {};
  const out = {};
  for (const [name, value] of Object.entries(data)) {
    if (typeof value === 'string') out[name] = { lastRead: value, messages: {} };
    else out[name] = { lastRead: value?.lastRead || null, messages: value?.messages && typeof value.messages === 'object' ? value.messages : {} };
  }
  return out;
}

function readProfiles() {
  const data = readJson(PROFILE_FILE, {});
  return data && typeof data === 'object' ? data : {};
}

function writeProfiles(data) {
  fs.writeFileSync(PROFILE_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function ensureProfileImagesDir() {
  if (!fs.existsSync(PROFILE_IMAGES_DIR)) fs.mkdirSync(PROFILE_IMAGES_DIR, { recursive: true });
}

function saveProfileAvatar(dataUrl) {
  const match = String(dataUrl || '').match(/^data:(image\/(?:png|jpeg|jpg|webp|gif));base64,([A-Za-z0-9+/=\s]+)$/i);
  if (!match) throw new Error('Foto inválida. Use PNG, JPG, WEBP ou GIF.');
  const mime = match[1].toLowerCase().replace('image/jpg', 'image/jpeg');
  const buffer = Buffer.from(match[2].replace(/\s/g, ''), 'base64');
  if (!buffer.length || buffer.length > 2 * 1024 * 1024) throw new Error('A foto deve ter no máximo 2 MB.');
  const extMap = {'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif'};
  const ext = extMap[mime];
  ensureProfileImagesDir();
  const filename = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${ext}`;
  fs.writeFileSync(path.join(PROFILE_IMAGES_DIR, filename), buffer);
  return `/profile-images/${filename}`;
}

function writeChatRead(data) {
  fs.writeFileSync(CHAT_READ_FILE, JSON.stringify(data, null, 2), 'utf8');
}






function readRemoteStatus() {
  const data = readJson(REMOTE_STATUS_FILE, { commands: {}, results: {} });
  return {
    commands: data && data.commands && typeof data.commands === 'object' ? data.commands : {},
    results: data && data.results && typeof data.results === 'object' ? data.results : {}
  };
}

function writeRemoteStatus(data) {
  fs.writeFileSync(REMOTE_STATUS_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function cleanupRemoteStatus() {
  const data = readRemoteStatus();
  const cutoff = Date.now() - 5 * 60 * 1000;
  for (const [target, command] of Object.entries(data.commands)) {
    if (!command || Date.parse(command.createdAt || '') < cutoff) delete data.commands[target];
  }
  for (const [id, result] of Object.entries(data.results)) {
    if (!result || Date.parse(result.createdAt || '') < cutoff) delete data.results[id];
  }
  writeRemoteStatus(data);
  return data;
}

function cleanupChat() {
  writeChat(readChat());
}

function extractMentions(text) {
  const names = teamNames().slice();
  if (expireLuccaIfNeeded().online && !names.includes('Lucca')) names.push('Lucca');
  const found = [];
  for (const match of String(text).matchAll(/@([\p{L}\p{N}_-]+)/gu)) {
    const raw = match[1].toLowerCase();
    if (raw === 'todos') {
      names.forEach(n => { if (!found.includes(n)) found.push(n); });
      continue;
    }
    const name = names.find(n => n.toLowerCase() === raw);
    if (name && !found.includes(name)) found.push(name);
  }
  return found;
}

function hash(password, salt = crypto.randomBytes(16).toString('hex')) {
  return `${salt}:${crypto.scryptSync(password, salt, 64).toString('hex')}`;
}

function matches(password, saved) {
  try {
    const [salt, old] = String(saved).split(':');
    const actual = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(old, 'hex'), Buffer.from(actual, 'hex'));
  } catch {
    return false;
  }
}

function cookie(req) {
  const row = (req.headers.cookie || '')
    .split(';')
    .map(x => x.trim())
    .find(x => x.startsWith('upstatus_session='));
  return row ? row.split('=')[1] : null;
}

function currentUser(req) {
  return sessions.get(req.headers['x-upstatus-token'] || cookie(req)) || null;
}

function currentRole(req) {
  const name = currentUser(req);
  return name ? (users()[name]?.role || 'implementation_user') : null;
}

function isAdmin(req) {
  return currentRole(req) === 'implementation_admin';
}

function cleanupChatAndReturn() {
  const clean = writeChat(readChat());
  cleanupChatImages(clean);
  return clean;
}

function createSession(res, name) {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, name);
  res.setHeader(
    'Set-Cookie',
    `upstatus_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${60 * 60 * 24 * 30}`
  );
  return token;
}

function send(res, code, body, type = 'application/json; charset=utf-8') {
  res.writeHead(code, {
    'Content-Type': type,
    'Cache-Control': 'no-store'
  });
  res.end(Buffer.isBuffer(body) || typeof body === 'string' ? body : JSON.stringify(body));
}

function bodyJson(req, callback) {
  let raw = '';
  req.on('data', chunk => { raw += chunk; });
  req.on('end', () => {
    try { callback(null, JSON.parse(raw || '{}')); }
    catch { callback(new Error('Pedido inválido.')); }
  });
}

function ensureHistoryFile() {
  if (!fs.existsSync(HISTORY_FILE)) writeHistory([]);
  if (!fs.existsSync(CHAT_FILE)) writeChat([]);
  ensureChatImagesDir();
  if (!fs.existsSync(CHAT_READ_FILE)) writeChatRead({});
  if (!fs.existsSync(LUCCA_FILE)) writeLucca({ online: false, session: null, joinedAt: null, lastSeen: null });
}

function migrateData() {
  const data = readData();
  writeData(data);
  ensureHistoryFile();

  const all = users();
  let changed = false;
  for (const name of teamNames()) {
    if (!all[name].role) {
      all[name].role = ['Ricardo', 'Lohan', 'Guilherme'].includes(name)
        ? 'implementation_admin'
        : 'implementation_user';
      changed = true;
    }
  }
  if (changed) saveUsers(all);
}

migrateData();

function requestHandler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);


  if (req.method === 'GET' && url.pathname === '/upstatus-icon.svg') {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><rect x="4" y="4" width="88" height="88" rx="22" fill="#182130"/><circle cx="48" cy="48" r="27" fill="none" stroke="#4f7dff" stroke-width="8"/><path d="M48 27v42M35 35l13-8 13 8M35 61l13 8 13-8" fill="none" stroke="#7fb1ff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    return send(res, 200, svg, 'image/svg+xml; charset=utf-8');
  }

  if (req.method === 'GET' && url.pathname === '/api/members') {
    const all = users();
    return send(res, 200, {
      members: Object.keys(all).map(name => ({ name }))
    });
  }

  if (req.method === 'GET' && url.pathname === '/api/update-info') {
    return send(res, 200, { version: CURRENT_VERSION, updateUrl: '/upstatus.user.js' });
  }

  if (req.method === 'POST' && url.pathname === '/api/lucca/login') {
    return bodyJson(req, (err, payload) => {
      if (err) return send(res, 400, { error: err.message });
      if (String(payload.password || '') !== LUCCA_PASSWORD) return send(res, 401, { error: 'Senha incorreta.' });
      const old = expireLuccaIfNeeded();
      if (old.online) {
        chatTyping.delete('Lucca');
        appendChatSystemEvent('lucca_leave', '🔴 Lucca Maluco saiu do chat.');
      }
      const token = crypto.randomBytes(32).toString('hex');
      const joinedAt = new Date().toISOString();
      writeLucca({ online: true, session: token, joinedAt, lastSeen: joinedAt });
      res.setHeader('Set-Cookie', `lucca_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400`);
      appendChatSystemEvent('lucca_join', '🔴 Lucca Maluco entrou no chat.');
      return send(res, 200, { ok: true, name: 'Lucca', joinedAt });
    });
  }

  if (req.method === 'GET' && url.pathname === '/api/lucca/me') {
    const guest = guestSession(req);
    return send(res, 200, guest ? { authenticated: true, name: 'Lucca', joinedAt: guest.joinedAt, online: true } : { authenticated: false, name: null, online: expireLuccaIfNeeded().online });
  }

  if (req.method === 'POST' && url.pathname === '/api/lucca/heartbeat') {
    const guest = guestSession(req);
    if (!guest) return send(res, 401, { error: 'Sessão do Lucca encerrada.' });
    guest.lastSeen = new Date().toISOString();
    writeLucca(guest);
    return send(res, 200, { ok: true, online: true });
  }

  if (req.method === 'POST' && url.pathname === '/api/lucca/logout') {
    const guest = guestSession(req);
    if (guest) {
      writeLucca({ ...guest, online: false, session: null, lastSeen: new Date().toISOString() });
      chatTyping.delete('Lucca');
      appendChatSystemEvent('lucca_leave', '🔴 Lucca Maluco saiu do chat.');
    }
    res.setHeader('Set-Cookie', 'lucca_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');
    return send(res, 200, { ok: true });
  }

  if (req.method === 'GET' && url.pathname === '/api/chat') {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    const ctx = currentChatContext(req);
    if (!ctx) return send(res, 401, { error: 'Faça login para acessar o chat.' });
    const allMessages = cleanupChatAndReturn();
    const messages = ctx.guest
      ? allMessages.filter(m => (m.type !== 'system' || m.systemType === 'chat_clear') && Date.parse(m.createdAt) >= ctx.joinedAt)
      : allMessages;
    const read = readChatRead();
    const mine = read[ctx.name] || { lastRead: null, messages: {} };
    const lastRead = mine.lastRead ? Date.parse(mine.lastRead) : 0;
    const enriched = messages.map(m => {
      const readers = [];
      for (const entry of Object.values(read)) {
        const names = Array.isArray(entry?.messages?.[m.id]) ? entry.messages[m.id] : [];
        names.forEach(n => { if (n && !readers.includes(n)) readers.push(n); });
      }
      return { ...m, readBy: readers };
    });
    const unreadCount = messages.filter(m => m.type !== 'system' && m.user !== ctx.name && Date.parse(m.createdAt) > lastRead).length;
    const profiles = readProfiles();
    const nowTyping = Date.now();
    const typing = [];
    for (const [user, at] of chatTyping.entries()) { if (user !== ctx.name && nowTyping - at < 4500) typing.push(user); else if (nowTyping - at >= 4500) chatTyping.delete(user); }
    return send(res, 200, { messages: enriched, unreadCount, profiles, typing, luccaOnline: expireLuccaIfNeeded().online });
  }

  if (req.method === 'GET' && url.pathname === '/api/profiles') {
    const ctx = currentChatContext(req);
    const name = ctx && ctx.name;
    if (!name) return send(res, 401, { error: 'Faça login para visualizar os perfis.' });
    return send(res, 200, { profiles: readProfiles() });
  }

  if (req.method === 'POST' && url.pathname === '/api/profile/avatar') {
    return bodyJson(req, (err, payload) => {
      if (err) return send(res, 400, { error: err.message });
      const ctx = currentChatContext(req);
      const name = ctx && ctx.name;
      if (!name) return send(res, 401, { error: 'Faça login para alterar sua foto.' });
      try {
        const profiles = readProfiles();
        const oldAvatarUrl = profiles[name];
        const avatarUrl = saveProfileAvatar(payload.dataUrl);
        profiles[name] = avatarUrl;
        writeProfiles(profiles);
        if (oldAvatarUrl) { try { const oldName = path.basename(oldAvatarUrl); const oldFile = path.join(PROFILE_IMAGES_DIR, oldName); if (fs.existsSync(oldFile)) fs.unlinkSync(oldFile); } catch {} }
        return send(res, 200, { ok: true, avatarUrl });
      } catch (e) {
        return send(res, 400, { error: e.message || 'Não foi possível salvar a foto.' });
      }
    });
  }

  if (req.method === 'POST' && url.pathname === '/api/chat/image') {
    return bodyJson(req, (err, payload) => {
      if (err) return send(res, 400, { error: err.message });
      const ctx = currentChatContext(req);
      const name = ctx && ctx.name;
      if (!name) return send(res, 401, { error: 'Faça login para enviar imagens.' });
      try {
        const saved = saveChatMedia(payload.dataUrl);
        return send(res, 200, { ok: true, imageUrl: saved.url, type: saved.type });
      } catch (e) {
        return send(res, 400, { error: e.message || 'Não foi possível salvar a imagem.' });
      }
    });
  }

  if (req.method === 'POST' && url.pathname === '/api/chat/audio') {
    return bodyJson(req, (err, payload) => {
      if (err) return send(res, 400, { error: err.message });
      const ctx = currentChatContext(req);
      const name = ctx && ctx.name;
      if (!name) return send(res, 401, { error: 'Faça login para enviar áudios.' });
      try {
        const saved = saveChatAudio(payload.dataUrl);
        return send(res, 200, { ok: true, imageUrl: saved.url, type: 'audio' });
      } catch (e) {
        return send(res, 400, { error: e.message || 'Não foi possível salvar o áudio.' });
      }
    });
  }

  if (req.method === 'POST' && url.pathname === '/api/chat') {
    return bodyJson(req, (err, payload) => {
      if (err) return send(res, 400, { error: err.message });
      const ctx = currentChatContext(req);
      const name = ctx && ctx.name;
      if (!name) return send(res, 401, { error: 'Faça login para enviar mensagens.' });
      const message = String(payload.message || '').trim();
      const imageUrl = String(payload.imageUrl || '').trim();
      const mediaType = payload.type === 'video' ? 'video' : (payload.type === 'audio' ? 'audio' : (imageUrl ? 'image' : 'text'));
      if (!message && !imageUrl) return send(res, 400, { error: 'Digite uma mensagem ou envie um arquivo.' });
      if (message.length > 1000) return send(res, 400, { error: 'A mensagem deve ter no máximo 1000 caracteres.' });
      if (imageUrl && !/^\/chat-images\/[A-Za-z0-9._-]+$/.test(imageUrl)) return send(res, 400, { error: 'Arquivo inválido.' });
      const allMessages = cleanupChatAndReturn();
      const messages = ctx.guest ? allMessages.filter(m => m.type !== 'system' && Date.parse(m.createdAt) >= ctx.joinedAt) : allMessages;
      let replyTo = null;
      if (payload.replyTo && payload.replyTo.id) {
        const target = messages.find(m => m.id === String(payload.replyTo.id));
        if (target) replyTo = { id: target.id, user: target.user, message: String(target.message || ''), type: target.type || 'text', imageUrl: target.imageUrl || '' };
      }
      const now = new Date().toISOString();
      const newMessage = { id: crypto.randomBytes(8).toString('hex'), user: name, message, type: mediaType, imageUrl: imageUrl || '', mentions: extractMentions(message), replyTo, reactions: {}, createdAt: now };
      allMessages.push(newMessage);
      writeChat(allMessages);
      return send(res, 200, { ok: true });
    });
  }

  if (req.method === 'POST' && url.pathname === '/api/chat/reaction') {
    return bodyJson(req, (err, payload) => {
      if (err) return send(res, 400, { error: err.message });
      const ctx = currentChatContext(req);
      const name = ctx && ctx.name;
      if (!name) return send(res, 401, { error: 'Faça login para reagir às mensagens.' });
      const id = String(payload.messageId || '');
      const emoji = String(payload.emoji || '');
      if (!id || !emoji || Array.from(emoji).length > 8) return send(res, 400, { error: 'Reação inválida.' });
      const allowed = ['😂','❤️','👍','😡','😮','😢','👏','🔥','🤣','😍'];
      if (!allowed.includes(emoji)) return send(res, 400, { error: 'Reação não permitida.' });
      const allMessages = cleanupChatAndReturn();
      const messages = ctx.guest ? allMessages.filter(m => m.type !== 'system' && Date.parse(m.createdAt) >= ctx.joinedAt) : allMessages;
      const target = messages.find(m => m.id === id);
      if (!target || target.type === 'system') return send(res, 404, { error: 'Mensagem não encontrada.' });
      const reactions = target.reactions && typeof target.reactions === 'object' ? target.reactions : {};
      const users = Array.isArray(reactions[emoji]) ? reactions[emoji].slice() : [];
      const idx = users.indexOf(name);
      if (idx >= 0) users.splice(idx, 1); else users.push(name);
      if (users.length) reactions[emoji] = users; else delete reactions[emoji];
      target.reactions = reactions;
      writeChat(messages);
      return send(res, 200, { ok: true, reactions });
    });
  }

  if (req.method === 'POST' && url.pathname === '/api/chat/clear') {
    const name = currentUser(req);
    if (!name) return send(res, 401, { error: 'Faça login para limpar o chat.' });
    if (name !== 'Ricardo') return send(res, 403, { error: 'Somente Ricardo pode limpar o chat.' });
    try {
      writeChat([]);
      appendChatSystemEvent('chat_clear', '🧹 Ricardo limpou o chat.');
      chatTyping.clear();
      return send(res, 200, { ok: true });
    } catch (e) { return send(res, 500, { error: e.message || 'Não foi possível limpar o chat.' }); }
  }

  if (req.method === 'DELETE' && url.pathname.startsWith('/api/chat/')) {
    const ctx = currentChatContext(req);
    const name = ctx && ctx.name;
    if (!name) return send(res, 401, { error: 'Faça login para excluir mensagens.' });
    const id = decodeURIComponent(url.pathname.slice('/api/chat/'.length));
    if (!id) return send(res, 400, { error: 'Mensagem inválida.' });
    const allMessages = cleanupChatAndReturn();
    const messages = ctx.guest ? allMessages.filter(m => m.type !== 'system' && Date.parse(m.createdAt) >= ctx.joinedAt) : allMessages;
    const target = messages.find(m => m.id === id);
    if (!target) return send(res, 404, { error: 'Mensagem não encontrada.' });
    if (target.user !== name) return send(res, 403, { error: 'Você só pode excluir suas próprias mensagens.' });
    writeChat(allMessages.filter(m => m.id !== id));
    return send(res, 200, { ok: true, id });
  }

  if (req.method === 'GET' && url.pathname === '/api/chat/typing') {
    const ctx = currentChatContext(req);
    const name = ctx && ctx.name;
    if (!name) return send(res, 401, { error: 'Faça login para usar o indicador de digitação.' });
    const nowTyping = Date.now();
    const typing = [];
    for (const [user, at] of chatTyping.entries()) { if (user !== name && nowTyping - at < 4500) typing.push(user); else if (nowTyping - at >= 4500) chatTyping.delete(user); }
    return send(res, 200, { typing });
  }

  if (req.method === 'POST' && url.pathname === '/api/chat/typing') {
    return bodyJson(req, (err, payload) => {
      if (err) return send(res, 400, { error: err.message });
      const ctx = currentChatContext(req);
      const name = ctx && ctx.name;
      if (!name) return send(res, 401, { error: 'Faça login para usar o indicador de digitação.' });
      if (payload.typing) chatTyping.set(name, Date.now()); else chatTyping.delete(name);
      const nowTyping = Date.now();
      const typing = [];
      for (const [user, at] of chatTyping.entries()) { if (user !== name && nowTyping - at < 4500) typing.push(user); else if (nowTyping - at >= 4500) chatTyping.delete(user); }
      return send(res, 200, { ok: true, typing });
    });
  }

  if (req.method === 'POST' && url.pathname === '/api/chat/read') {
    return bodyJson(req, (err, payload) => {
      if (err) return send(res, 400, { error: err.message });
      const ctx = currentChatContext(req);
      const name = ctx && ctx.name;
      if (!name) return send(res, 401, { error: 'Faça login para marcar mensagens como lidas.' });
      const ids = Array.isArray(payload.messageIds) ? payload.messageIds.map(String).filter(Boolean).slice(0, 1000) : [];
      const now = new Date().toISOString();
      const read = readChatRead();
      const entry = read[name] || { lastRead: null, messages: {} };
      entry.lastRead = now;
      const messages = readChat();
      const validIds = new Set(messages.filter(m => m.user !== name).map(m => m.id));
      ids.forEach(id => {
        if (!validIds.has(id)) return;
        const readers = Array.isArray(entry.messages[id]) ? entry.messages[id] : [];
        if (!readers.includes(name)) readers.push(name);
        entry.messages[id] = readers;
      });
      read[name] = entry;
      writeChatRead(read);
      const barui = readBarui();
      if (barui[name]) {
        delete barui[name];
        writeBarui(barui);
      }
      return send(res, 200, { ok: true });
    });
  }


  if (req.method === 'POST' && url.pathname === '/api/remote-status') {
    return bodyJson(req, (err, payload) => {
      if (err) return send(res, 400, { error: err.message });
      const sender = currentUser(req);
      if (!sender) return send(res, 401, { error: 'Faça login para controlar a fila.' });
      if (!isAdmin(req)) return send(res, 403, { error: 'Somente administradores podem controlar a fila de outro usuário.' });
      const target = String(payload.target || '').trim();
      const status = String(payload.status || '').trim();
      const reason = String(payload.reason || '').trim();
      if (!teamNames().includes(target) || target === sender) return send(res, 400, { error: 'Usuário alvo inválido.' });
      if (!['online','busy','away'].includes(status)) return send(res, 400, { error: 'Status inválido.' });
      if (status !== 'online' && !reason) return send(res, 400, { error: 'Informe um motivo.' });
      const data = cleanupRemoteStatus();
      const id = crypto.randomBytes(10).toString('hex');
      data.commands[target] = { id, sender, target, status, reason: status === 'online' ? '' : reason, createdAt: new Date().toISOString() };
      writeRemoteStatus(data);
      return send(res, 200, { ok: true, commandId: id });
    });
  }

  if (req.method === 'GET' && url.pathname === '/api/remote-status') {
    const name = currentUser(req);
    if (!name) return send(res, 401, { error: 'Faça login para receber comandos.' });
    const data = cleanupRemoteStatus();
    const command = data.commands[name];
    return send(res, 200, command ? { pending: true, command } : { pending: false });
  }

  if (req.method === 'POST' && url.pathname === '/api/remote-status/result') {
    return bodyJson(req, (err, payload) => {
      if (err) return send(res, 400, { error: err.message });
      const name = currentUser(req);
      if (!name) return send(res, 401, { error: 'Faça login para enviar o resultado.' });
      const commandId = String(payload.commandId || '').trim();
      const data = cleanupRemoteStatus();
      const command = data.commands[name];
      if (!command || command.id !== commandId) return send(res, 404, { error: 'Comando não encontrado ou já processado.' });
      const ok = payload.ok === true;
      data.results[commandId] = {
        commandId,
        sender: command.sender,
        target: name,
        status: command.status,
        reason: command.reason || '',
        ok,
        error: ok ? '' : String(payload.error || 'Falha ao executar o comando.'),
        createdAt: new Date().toISOString()
      };
      delete data.commands[name];
      writeRemoteStatus(data);
      return send(res, 200, { ok: true });
    });
  }

  if (req.method === 'GET' && url.pathname === '/api/remote-status/result') {
    const name = currentUser(req);
    if (!name) return send(res, 401, { error: 'Faça login para consultar o resultado.' });
    if (!isAdmin(req)) return send(res, 403, { error: 'Somente administradores podem consultar resultados.' });
    const id = String(url.searchParams.get('id') || '').trim();
    if (!id) return send(res, 400, { error: 'Comando inválido.' });
    const data = cleanupRemoteStatus();
    const result = data.results[id];
    if (!result || result.sender !== name) return send(res, 404, { error: 'Resultado ainda não disponível.' });
    return send(res, 200, { ready: true, result });
  }

  if (req.method === 'GET' && url.pathname === '/api/status') {
    if (!currentUser(req)) return send(res, 401, { error: 'Faça login para visualizar a equipe.' });
    return send(res, 200, readData());
  }

  if (req.method === 'GET' && url.pathname === '/api/me') {
    const name = currentUser(req);
    const account = name && users()[name];
    return send(res, 200, {
      authenticated: Boolean(name),
      name: name || null,
      role: name ? (account?.role || 'implementation_user') : null,
      canViewHistory: name ? (account?.role === 'implementation_admin') : false,
      needsSetup: !account || !account.passwordHash
    });
  }

  if (req.method === 'GET' && url.pathname === '/api/account') {
    const name = url.searchParams.get('name');
    const account = users()[name];
    return send(res, 200, {
      needsSetup: !account || !account.passwordHash
    });
  }

  if (req.method === 'GET' && url.pathname === '/api/history') {
    const name = currentUser(req);
    if (!name) return send(res, 401, { error: 'Faça login para visualizar o histórico.' });
    if (!isAdmin(req)) return send(res, 403, { error: 'Seu perfil não possui acesso ao histórico.' });

    const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || 100), 1), 500);
    const history = readHistory().slice(-limit).reverse();
    return send(res, 200, { history });
  }

  if (req.method === 'POST' && url.pathname === '/api/status') {
    return bodyJson(req, (err, payload) => {
      if (err) return send(res, 400, { error: err.message });

      const { status, reason = '', actor = '', target = '' } = payload;
      const name = currentUser(req);

      if (!name) return send(res, 401, { error: 'Faça login para alterar seu status.' });
      if (!['online', 'busy', 'away'].includes(status)) return send(res, 400, { error: 'Status inválido.' });

      const cleanReason = status === 'online' ? '' : String(reason).trim();
      if (status !== 'online' && !cleanReason) return send(res, 400, { error: 'Informe um motivo.' });

      const data = readData();
      const previous = data.members[name] || {
        name,
        status: 'offline',
        reason: '',
        updatedAt: null,
        sync: 'not_configured'
      };

      const changed = previous.status !== status || (previous.reason || '') !== cleanReason;
      const now = new Date().toISOString();

      if (changed) {
        data.members[name] = {
          ...previous,
          name,
          status,
          reason: cleanReason,
          updatedAt: now,
          sync: previous.sync || 'not_configured'
        };

        const history = readHistory();
        const historyActor = String(actor || name).trim();
        const historyTarget = String(target || name).trim();
        const actorAllowed = historyActor === name || (isAdmin(req) && historyTarget === name && teamNames().includes(historyActor));
        history.push({
          user: name,
          actor: actorAllowed ? historyActor : name,
          target: historyTarget === name ? name : name,
          status,
          reason: cleanReason,
          createdAt: now
        });

        writeData(data);
        writeHistory(history);
      }

      return send(res, 200, data.members[name]);
    });
  }

  if (req.method === 'POST' && (url.pathname === '/api/setup' || url.pathname === '/api/login')) {
    return bodyJson(req, (err, payload) => {
      if (err) return send(res, 400, { error: err.message });

      const { name, password } = payload;
      const allUsers = users();

      if (!allUsers[name] || !password || password.length < 6) {
        return send(res, 400, { error: 'Use um usuário válido e uma senha de pelo menos 6 caracteres.' });
      }

      if (url.pathname === '/api/setup') {
        if (allUsers[name].passwordHash) {
          return send(res, 409, { error: 'Esta conta já foi configurada.' });
        }

        allUsers[name].passwordHash = hash(password);
        if (!allUsers[name].role) {
          allUsers[name].role = ['Ricardo', 'Lohan', 'Guilherme'].includes(name)
            ? 'implementation_admin'
            : 'implementation_user';
        }
        saveUsers(allUsers);

        const token = createSession(res, name);
        return send(res, 200, {
          name,
          role: allUsers[name].role,
          canViewHistory: allUsers[name].role === 'implementation_admin',
          token
        });
      }

      if (!allUsers[name]?.passwordHash || !matches(password, allUsers[name].passwordHash)) {
        return send(res, 401, { error: 'Nome ou senha incorretos.' });
      }

      const token = createSession(res, name);
      return send(res, 200, {
        name,
        role: allUsers[name].role || 'implementation_user',
        canViewHistory: (allUsers[name].role || 'implementation_user') === 'implementation_admin',
        token
      });
    });
  }

  if (req.method === 'POST' && url.pathname === '/api/logout') {
    const token = req.headers['x-upstatus-token'] || cookie(req);
    if (token) sessions.delete(token);
    res.setHeader('Set-Cookie', 'upstatus_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');
    return send(res, 200, { ok: true });
  }

  if (req.method === 'GET' && url.pathname === '/upstatus.user.js') {
    if (!fs.existsSync(UPDATE_SCRIPT_FILE)) return send(res, 404, { error: 'Script de atualização não encontrado.' });
    return send(res, 200, fs.readFileSync(UPDATE_SCRIPT_FILE, 'utf8'), 'application/javascript; charset=utf-8');
  }

  if (req.method === 'GET' && url.pathname === '/lucca-devil-laugh.wav') {
    const file = path.join(ROOT, 'lucca-devil-laugh.wav');
    if (!fs.existsSync(file)) return send(res, 404, { error: 'Som não encontrado.' });
    res.setHeader('Cache-Control', 'no-store');
    return send(res, 200, fs.readFileSync(file), 'audio/wav');
  }

  if (req.method === 'GET' && url.pathname.startsWith('/profile-images/')) {
    const name = path.basename(decodeURIComponent(url.pathname.slice('/profile-images/'.length)));
    const file = path.join(PROFILE_IMAGES_DIR, name);
    if (!name || !fs.existsSync(file)) return send(res, 404, { error: 'Foto não encontrada.' });
    const ext = path.extname(name).toLowerCase();
    const types = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif' };
    return send(res, 200, fs.readFileSync(file), types[ext] || 'application/octet-stream');
  }

  if (req.method === 'GET' && url.pathname.startsWith('/chat-images/')) {
    const name = path.basename(decodeURIComponent(url.pathname.slice('/chat-images/'.length)));
    const file = path.join(CHAT_IMAGES_DIR, name);
    if (!name || !fs.existsSync(file)) return send(res, 404, { error: 'Imagem não encontrada.' });
    const ext = path.extname(name).toLowerCase();
    const types = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.mp4': 'video/mp4', '.webm': 'video/webm', '.ogg': 'audio/ogg', '.m4a': 'audio/mp4', '.mp3': 'audio/mpeg' };
    return send(res, 200, fs.readFileSync(file), types[ext] || 'application/octet-stream');
  }

  if (req.method === 'GET' && url.pathname === '/lucca') {
    return send(res, 200, fs.readFileSync(path.join(ROOT, 'lucca.html'), 'utf8'), 'text/html; charset=utf-8');
  }

  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
    return send(
      res,
      200,
      fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'),
      'text/html; charset=utf-8'
    );
  }

  if (req.method === 'GET' && url.pathname === '/skeleton.gif') {
    return send(res, 200, fs.readFileSync(path.join(ROOT, 'skeleton.gif')), 'image/gif');
  }

  send(res, 404, { error: 'Não encontrado.' });
}

const server = http.createServer(requestHandler);
server.listen(PORT, '0.0.0.0', () => {
  console.log(`UpStatus aberto em http://0.0.0.0:${PORT}`);
  try {
    if (fs.existsSync(TLS_KEY_FILE) && fs.existsSync(TLS_CERT_FILE)) {
      const tlsServer = https.createServer({ key: fs.readFileSync(TLS_KEY_FILE), cert: fs.readFileSync(TLS_CERT_FILE) }, requestHandler);
      tlsServer.listen(HTTPS_PORT, '0.0.0.0', () => console.log(`UpStatus HTTPS aberto em https://0.0.0.0:${HTTPS_PORT}`));
    } else console.warn('HTTPS desabilitado: certificado TLS não encontrado.');
  } catch (e) { console.warn('HTTPS não pôde iniciar:', e.message); }
});
