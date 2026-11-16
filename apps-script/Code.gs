var SSID = '10rCfwHKfLNkLQRd9AInudcuVDsqTFryCfSKh6Nlomrk';
var TZ = 'Asia/Taipei';
var KEY = { '熱身': 'w', '正式': 'k', '突破': 'b', '次數': 'r' };

// 建議設定一組自己的密碼（與前端網頁設定的 Token 一致），避免網址外流被別人讀寫
// 若暫時不想設密碼，可留空 ''
var API_TOKEN = '';

function jsonOut_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function checkToken_(token) {
  if (API_TOKEN && String(token || '') !== API_TOKEN) {
    throw new Error('Token 驗證失敗，請檢查設定');
  }
}

function doGet(e) {
  var p = (e && e.parameter) ? e.parameter : {};
  if (p.api === '1') {
    try {
      checkToken_(p.token);
      return jsonOut_({ ok: true, data: getData_() });
    } catch (err) {
      return jsonOut_({ ok: false, error: err.message });
    }
  }
  var t = HtmlService.createTemplateFromFile('index');
  t.payload = JSON.stringify(getData_());
  return t.evaluate()
    .setTitle('重訓紀錄')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) ? e.postData.contents : '{}');
    checkToken_(body.token);
    var action = body.action;
    var payload = body.payload || {};
    var data;
    if (action === 'getData') data = getData_();
    else if (action === 'saveWorkout') data = saveWorkout(payload);
    else if (action === 'updateWorkout') data = updateWorkout(payload);
    else if (action === 'deleteWorkout') data = deleteWorkout(payload);
    else if (action === 'saveBody') data = saveBody(payload);
    else if (action === 'updateBody') data = updateBody(payload);
    else if (action === 'deleteBody') data = deleteBody(payload);
    else throw new Error('未知的操作：' + action);
    return jsonOut_({ ok: true, data: data });
  } catch (err) {
    return jsonOut_({ ok: false, error: err.message });
  }
}

function getData() { return getData_(); }

function fmt_(v) { return v instanceof Date ? Utilities.formatDate(v, TZ, 'yyyy-MM-dd') : String(v || ''); }

function getData_() {
  var ss = SpreadsheetApp.openById(SSID);
  var log = ss.getSheetByName('訓練紀錄').getDataRange().getDisplayValues().slice(1)
    .filter(function (r) { return r[1] && r[3]; })
    .map(function (r) {
      return { d: r[1], day: r[2], ex: r[3], set: r[4], kg: Number(r[5]) || 0, reps: Number(r[6]) || 0 };
    });
  var menu = ss.getSheetByName('動作').getDataRange().getDisplayValues().slice(1)
    .filter(function (r) { return r[0]; })
    .map(function (r) { return { ex: r[0], day: r[1], part: r[2], w: Number(r[3]) || 0, k: Number(r[4]) || 0 }; });
  var cfg = ss.getSheetByName('設定');
  var days = String(cfg.getRange('B3').getValue()).split(',').map(function (s) { return s.trim(); }).filter(String);
  var raw = [];
  days.forEach(function (day) {
    var sh = ss.getSheetByName(day + '紀錄');
    if (!sh || sh.getLastRow() < 2) return;
    var v = sh.getDataRange().getValues(), hdr = v[0];
    v.slice(1).forEach(function (r) {
      if (!r[0] || !r[1]) return;
      var items = {};
      hdr.forEach(function (h, i) {
        var m = String(h).match(/^(.*)_(熱身|正式|突破|次數)$/);
        if (!m) return;
        (items[m[1]] = items[m[1]] || {})[KEY[m[2]]] = (r[i] === '' ? '' : Number(r[i]));
      });
      raw.push({ id: String(r[0]), day: day, d: fmt_(r[1]), items: items });
    });
  });
  var bsh = ss.getSheetByName('身體狀況');
  var body = (bsh && bsh.getLastRow() > 1) ? bsh.getRange(2, 1, bsh.getLastRow() - 1, 7).getValues()
    .filter(function (r) { return r[0] && r[1]; })
    .map(function (r) { return { id: String(r[0]), d: fmt_(r[1]), f: Number(r[2]) || 0, sleep: r[3] === '' ? '' : String(r[3]), sore: String(r[4] || ''), note: String(r[5] || ''), st: String(r[6] || '') }; }) : [];
  var now = new Date();
  return {
    now: Utilities.formatDate(now, TZ, 'yyyy-MM-dd HH:mm'),
    today: Utilities.formatDate(now, TZ, 'yyyy-MM-dd'),
    target: Number(cfg.getRange('B2').getValue()) || 3,
    days: days, menu: menu, log: log, raw: raw, body: body
  };
}

function newId_() { return Utilities.getUuid().slice(0, 8); }
function toDate_(s) { return Utilities.parseDate(s, TZ, 'yyyy-MM-dd'); }
function num_(v) { return (v === '' || v === null || v === undefined || isNaN(Number(v))) ? '' : Number(v); }
function withLock_(fn) {
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try { fn(); SpreadsheetApp.flush(); } finally { lock.releaseLock(); }
  return getData_();
}
function findRow_(sh, id) {
  var ids = sh.getRange(1, 1, sh.getLastRow(), 1).getValues();
  for (var i = 1; i < ids.length; i++) if (String(ids[i][0]) === String(id)) return i + 1;
  throw new Error('找不到這筆紀錄（可能已被刪除）');
}
function workoutRow_(sh, p, id) {
  var hdr = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var by = {};
  (p.items || []).forEach(function (it) { by[it.ex] = it; });
  return hdr.map(function (h) {
    h = String(h);
    if (h === 'ID') return id;
    if (h === '日期') return toDate_(p.date);
    var m = h.match(/^(.*)_(熱身|正式|突破|次數)$/);
    if (!m || !by[m[1]]) return '';
    return num_(by[m[1]][KEY[m[2]]]);
  });
}
function bodyRow_(b, id) {
  return [id, toDate_(b.date), num_(b.f), num_(b.sleep), b.sore || '', b.note || '', b.st || ''];
}
function daySheet_(day) {
  var sh = SpreadsheetApp.openById(SSID).getSheetByName(day + '紀錄');
  if (!sh) throw new Error('找不到 ' + day + '紀錄');
  return sh;
}
function bodySheet_() { return SpreadsheetApp.openById(SSID).getSheetByName('身體狀況'); }

function saveWorkout(p) {
  return withLock_(function () {
    var sh = daySheet_(p.day);
    sh.appendRow(workoutRow_(sh, p, newId_()));
    if (p.body) { var b = bodySheet_(); p.body.date = p.date; b.appendRow(bodyRow_(p.body, newId_())); b.getRange(b.getLastRow(), 2).setNumberFormat('yyyy-mm-dd'); }
  });
}
function updateWorkout(p) {
  return withLock_(function () {
    var sh = daySheet_(p.day), r = findRow_(sh, p.id), row = workoutRow_(sh, p, p.id);
    sh.getRange(r, 1, 1, row.length).setValues([row]);
  });
}
function deleteWorkout(p) {
  return withLock_(function () { var sh = daySheet_(p.day); sh.deleteRow(findRow_(sh, p.id)); });
}
function saveBody(p) {
  return withLock_(function () { var b = bodySheet_(); b.appendRow(bodyRow_(p, newId_())); b.getRange(b.getLastRow(), 2).setNumberFormat('yyyy-mm-dd'); });
}
function updateBody(p) {
  return withLock_(function () { var b = bodySheet_(), r = findRow_(b, p.id); b.getRange(r, 1, 1, 7).setValues([bodyRow_(p, p.id)]); });
}
function deleteBody(p) {
  return withLock_(function () { var b = bodySheet_(); b.deleteRow(findRow_(b, p.id)); });
}
