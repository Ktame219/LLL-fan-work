(function () {
  var DICE_ICON = {
    slash: 'assets/dice/slash.png',
    pierce: 'assets/dice/pierce.png',
    blunt: 'assets/dice/blunt.png',
    block: 'assets/dice/block.png',
    evade: 'assets/dice/evade.png'
  };

  var WAIT = { clash: 1400, parry: 900, onesided: 1100, fizzle: 900, cancel: 900, stagger: 1300, death: 1400, banner: 1000, over: 900, dot: 1100 };
  var BANNER_MS = 1500;
  var APPROACH_MS = 520;
  var IMPACT_MS = 280;

  var state = {
    phase: 'setup',
    enemyId: '',
    meSlot: null,
    foeSlot: null,
    battle: null,
    selected: { ui: 0, slot: 0 },
    intro: 0,
    assignments: [],
    targets: [],
    guard: [],
    aiming: null,
    hover: null,
    events: [],
    cursor: 0,
    view: null,
    introView: null,
    focus: { player: -1, enemy: -1 },
    note: '',
    busy: false,
    rolling: false,
    landed: false,
    flashSlot: null,
    fresh: {},
    paused: false,
    timer: null,
    fxOn: false,
    barPct: {},
    beat: 'resolve',
    poses: {},
    curtain: false,
    loggedAt: -1,
    sheet: null
  };

  function $(id) { return document.getElementById(id); }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function logLine(text, cls) {
    var el = $('log');
    var div = document.createElement('div');
    if (cls) div.className = cls;
    div.textContent = text;
    el.appendChild(div);
    el.scrollTop = el.scrollHeight;
  }

  function resistChips(resist) {
    return ['slash', 'pierce', 'blunt'].map(function (type) {
      var key = resist[type];
      return '<span class="reschip ' + key + '">' + DIE_SHORT[type] + ' ' + RES_LABEL[key] + '</span>';
    }).join('');
  }

  function uniquePages(ids) {
    var seen = {};
    var out = [];
    ids.forEach(function (id) {
      if (seen[id]) return;
      seen[id] = true;
      out.push(PAGE[id]);
    });
    return out;
  }

  function dieIcon(type) {
    return '<img src="' + DICE_ICON[type] + '" alt="" onerror="this.classList.add(\'fail\')">';
  }

  function dieRange(die) {
    var range = die.roll || (die.min + '–' + die.max);
    return '<span class="diepip ' + die.type + '">' + dieIcon(die.type) +
      '<b>' + DIE_SHORT[die.type] + '</b> ' + range + '</span>';
  }

  function shares(a, b) {
    for (var i = 0; i < a.length; i++) if (b.indexOf(a[i]) >= 0) return true;
    return false;
  }

  function chosenTeams() {
    var saved = readFormation();
    var allies = state.meSlot == null ? [] : (saved.presets[state.meSlot] || []);
    var foes = state.foeSlot == null ? [] : (saved.presets[state.foeSlot] || []);
    return { presets: saved.presets, allies: allies, foes: foes };
  }

  function sideHtml(key, label, presets, current, other, otherIds) {
    var html = '<h2>' + label + '<span>' + (current == null ? '未選択' : '編成' + (current + 1) + 'を選択中') + '</span></h2><div class="pres">';
    for (var i = 0; i < 5; i++) {
      var team = presets[i] || [];
      var blocked = !team.length || other === i || (other != null && shares(team, otherIds));
      var note = !team.length ? '未完成' : other === i ? '使用中' : (other != null && shares(team, otherIds)) ? '重複' : team.length + '/5';
      html += '<button type="button" class="pre" data-side="' + key + '" data-i="' + i + '" aria-pressed="' + (current === i) + '"' +
        (blocked ? ' disabled' : '') + '><span class="in">編成' + (i + 1) + '<small>' + note + '</small></span></button>';
    }
    html += '</div><div class="mini">';
    var picked = current == null ? [] : (presets[current] || []);
    for (var n = 0; n < 5; n++) {
      var unit = picked[n] ? ROSTER[picked[n]] : null;
      html += unit
        ? '<div class="frame m"><div class="in"><img src="' + esc(unit.portrait) + '" alt="">' +
          '<div class="pl"><b>' + esc(unit.name) + '</b><small class="at-' + unit.attack + '">' + ATTACK_LABEL[unit.attack] + '</small></div></div></div>'
        : '<div class="frame m empty"><div class="in">' + (current == null ? '？' : '＋') + '</div></div>';
    }
    var members = picked.map(function (id) { return ROSTER[id]; }).filter(Boolean);
    var hp = members.reduce(function (sum, unit) { return sum + unit.hp; }, 0);
    var speed = members.length
      ? (members.reduce(function (sum, unit) { return sum + (unit.speedMin + unit.speedMax) / 2; }, 0) / members.length).toFixed(1)
      : '-';
    html += '</div><div class="sum">' + (members.length ? '合計体力 <b>' + hp + '</b>　平均速度 <b>' + speed + '</b>' : '編成を選んでください') + '</div>';
    return html;
  }

  function renderSetup() {
    var pack = chosenTeams();
    if (state.meSlot != null && !(pack.presets[state.meSlot] || []).length) state.meSlot = null;
    if (state.foeSlot != null && !(pack.presets[state.foeSlot] || []).length) state.foeSlot = null;
    if (state.meSlot != null && state.foeSlot != null && (state.meSlot === state.foeSlot || shares(pack.allies, pack.foes))) state.foeSlot = null;
    pack = chosenTeams();
    var me = $('me');
    var foe = $('foe');
    if (!me || !foe) return;
    me.innerHTML = sideHtml('me', '自チーム', pack.presets, state.meSlot, state.foeSlot, pack.foes);
    foe.innerHTML = sideHtml('foe', '相手チーム', pack.presets, state.foeSlot, state.meSlot, pack.allies);
    var ready = state.meSlot != null && state.foeSlot != null && pack.allies.length && pack.foes.length && !shares(pack.allies, pack.foes);
    var msg = $('msg');
    if (msg) {
      msg.textContent = ready
        ? pack.allies.map(function (id) { return ROSTER[id].name; }).join('、') + ' 対 ' + pack.foes.map(function (id) { return ROSTER[id].name; }).join('、')
        : '自チームと相手チームを選んでください';
    }
    var start = $('startBtn');
    if (start) start.disabled = !ready;
  }

  function shownOf(unit) {
    var group = state.view && (unit.side === 'player' ? state.view.allies : state.view.foes);
    if (group && group[unit.ui]) return group[unit.ui];
    return unit;
  }

  function unitAt(side, ui) {
    var list = side === 'player' ? state.battle.allies : state.battle.foes;
    ui = Number(ui);
    for (var i = 0; i < list.length; i++) if (list[i].ui === ui) return list[i];
    return null;
  }

  function flatIndex(side, ui, slot) {
    var list = side === 'player' ? state.battle.allies : state.battle.foes;
    var n = 0;
    for (var i = 0; i < list.length; i++) {
      if (list[i].dead) continue;
      if (list[i].ui === ui) return n + slot;
      n += list[i].speedDice.length;
    }
    return slot;
  }

  function currentEvent() {
    if (state.phase !== 'play' && state.phase !== 'over') return null;
    return state.events[state.cursor] || null;
  }

  function bar(unit, cls, cur, max) {
    var pct = max <= 0 ? 0 : Math.max(0, Math.min(100, cur / max * 100));
    var key = unit.side + '-' + unit.ui + '-' + cls;
    var from = state.barPct[key] == null ? pct : state.barPct[key];
    state.barPct[key] = pct;
    return '<div class="bar ' + cls + '">' +
      '<span class="ghost" style="width:' + from.toFixed(1) + '%" data-to="' + pct.toFixed(1) + '"></span>' +
      '<span class="fill" style="width:' + from.toFixed(1) + '%" data-to="' + pct.toFixed(1) + '"></span></div>';
  }

  function pips(cur, max) {
    var html = '';
    for (var i = 0; i < max; i++) html += '<i class="' + (i < cur ? 'on' : '') + '"></i>';
    return '<span class="pips">' + html + '</span>';
  }

  function slotPage(side, ui, slot) {
    var unit = unitAt(side, ui);
    if (!unit) return null;
    if (state.phase === 'plan') {
      if (side === 'player') {
        var ids = state.assignments[ui] || [];
        return findSkill(unit, ids[slot]);
      }
      var plan = state.battle.foePlan && state.battle.foePlan[ui];
      return plan ? findSkill(unit, plan.skills[slot]) : null;
    }
    var die = unit.speedDice[slot];
    return die ? die.page : null;
  }

  function slotTarget(side, ui, slot) {
    if (state.phase === 'plan') {
      if (side === 'player') {
        var aims = state.targets[ui] || [];
        return aims[slot] == null ? null : aims[slot];
      }
      var plan = state.battle.foePlan && state.battle.foePlan[ui];
      return plan && plan.targets[slot] != null ? plan.targets[slot] : null;
    }
    var unit = unitAt(side, ui);
    var die = unit && unit.speedDice[slot];
    return die && die.page ? die.target : null;
  }

  function slotHtml(unit, interactive) {
    if (shownOf(unit).dead || unit.dead) return '';
    var planning = state.phase === 'plan' && !state.busy;
    return '<div class="speeds">' + unit.speedDice.map(function (die, i) {
      var page = slotPage(unit.side, unit.ui, i);
      var label = page ? page.name : (interactive ? '未設定' : '—');
      var set = !!page;
      var cls = 'slot';
      if (set) cls += ' set';
      var picked = state.selected && state.selected.ui === unit.ui && state.selected.slot === i;
      if (interactive && picked && !state.busy) cls += ' sel';
      if (state.focus && state.focus[unit.side] === i && state.focus[unit.side + 'Ui'] === unit.ui) cls += ' hot';
      if (state.rolling) cls += ' rolling';
      if (state.landed) cls += ' landed';
      if (shownOf(unit).staggered) cls += ' dazed';
      if (interactive && state.flashSlot && state.flashSlot.ui === unit.ui && state.flashSlot.slot === i) cls += ' flash';
      if (unit.side === 'enemy' && planning && state.aiming) cls += ' pickable';
      if (unit.side === 'enemy' && planning && state.aiming && (state.targets[state.aiming.ui] || [])[state.aiming.slot] === flatIndex('enemy', unit.ui, i)) cls += ' aimed';
      var num = state.rolling ? '·' : die.speed;
      var attrs = ' class="' + cls + '" data-side="' + unit.side + '" data-ui="' + unit.ui + '" data-slot="' + i + '" data-flat="' + flatIndex(unit.side, unit.ui, i) + '"';
      var inner = '<b>' + num + '</b><span>' + esc(label) + '</span>';
      if (interactive) return '<button type="button"' + attrs + ' data-act="slot">' + inner + '</button>';
      if (unit.side === 'enemy' && planning) {
        return '<button type="button"' + attrs + ' data-act="target" title="狙うダイスに選ぶ">' + inner + '</button>';
      }
      return '<div' + attrs + '>' + inner + '</div>';
    }).join('') + '</div>';
  }

  function localRect(el, root) {
    var r = el.getBoundingClientRect();
    var base = root || document.getElementById('screen') || document.body;
    var sr = base.getBoundingClientRect();
    var frame = document.getElementById('screen');
    var scale = frame && Number(frame.dataset.scale) ? Number(frame.dataset.scale) : 1;
    var rotated = !!(frame && frame.dataset.rotate === '1');
    var cx = r.left + r.width / 2;
    var cy = r.top + r.height / 2;
    var scx = sr.left + sr.width / 2;
    var scy = sr.top + sr.height / 2;
    var x = rotated ? base.offsetWidth / 2 - (cy - scy) / scale : (cx - sr.left) / scale;
    var y = rotated ? base.offsetHeight / 2 + (cx - scx) / scale : (cy - sr.top) / scale;
    var w = el.offsetWidth;
    var h = el.offsetHeight;
    return { cx: x, cy: y, left: x - w / 2, top: y - h / 2, width: w, height: h };
  }

  function slotCenter(side, ui, slot) {
    var el = document.querySelector('.slot[data-side="' + side + '"][data-ui="' + ui + '"][data-slot="' + slot + '"]');
    if (!el) return null;
    var box = localRect(el, $('stage'));
    return { x: box.cx, y: box.top + 10, top: box.top, bottom: box.top + box.height };
  }

  function arrowPath(a, b, rank) {
    var lift = 50 + Math.abs(b.x - a.x) * 0.1 + rank * 46;
    var cy = Math.min(a.y, b.y) - lift;
    return 'M' + a.x.toFixed(1) + ' ' + a.y.toFixed(1) + ' Q' + ((a.x + b.x) / 2).toFixed(1) + ' ' + cy.toFixed(1) +
      ' ' + b.x.toFixed(1) + ' ' + b.y.toFixed(1);
  }

  function flatCenter(side, index) {
    if (index == null || !state.battle) return null;
    var list = side === 'player' ? state.battle.allies : state.battle.foes;
    var n = 0;
    for (var i = 0; i < list.length; i++) {
      if (list[i].dead) continue;
      if (index < n + list[i].speedDice.length) return slotCenter(side, list[i].ui, index - n);
      n += list[i].speedDice.length;
    }
    return null;
  }

  function isHovered(side, ui, slot) {
    return !!state.hover && state.hover.side === side && Number(state.hover.ui) === Number(ui) && Number(state.hover.slot) === Number(slot);
  }

  function drawArrows() {
    var svg = $('arrows');
    if (!state.battle || state.phase !== 'plan' || state.busy) { svg.innerHTML = ''; return; }
    var defs = '<defs>' +
      ['clash', 'cancel', 'mine', 'foe'].map(function (k) {
        return '<marker id="head-' + k + '" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">' +
          '<path d="M0 0 L10 5 L0 10 z" class="head ' + k + '"/></marker>';
      }).join('') + '</defs>';
    var rows = previewEngagements(state.battle, state.assignments, state.targets);
    var paths = '';
    var rank = 0;
    rows.forEach(function (row) {
      var a;
      var b;
      var kind;
      var hot;
      if (row.kind === 'clash' || row.kind === 'cancel') {
        a = slotCenter('player', row.playerUi, row.player);
        b = slotCenter('enemy', row.enemyUi, row.enemy);
        kind = row.kind;
        hot = isHovered('player', row.playerUi, row.player) || isHovered('enemy', row.enemyUi, row.enemy);
      } else if (row.side === 'player') {
        a = slotCenter('player', row.ui, row.slot);
        b = flatCenter('enemy', row.target);
        kind = 'mine';
        hot = isHovered('player', row.ui, row.slot);
      } else {
        if (!isHovered('enemy', row.ui, row.slot)) return;
        a = slotCenter('enemy', row.ui, row.slot);
        b = flatCenter('player', row.target);
        kind = 'foe';
        hot = true;
      }
      if (!a || !b) return;
      var d = arrowPath(a, b, rank);
      rank += 1;
      var start = kind === 'clash' || kind === 'cancel' ? ' marker-start="url(#head-' + kind + ')"' : '';
      paths += '<path d="' + d + '" class="arrow-glow ' + kind + (hot ? ' hot' : '') + '"/>' +
        '<path d="' + d + '" class="arrow ' + kind + (hot ? ' hot' : '') + '"' + start + ' marker-end="url(#head-' + kind + ')"/>';
    });
    svg.innerHTML = defs + paths;
    svg.setAttribute('class', 'arrows' + (state.hover ? ' focus' : ''));
  }

  function intelHtml(side, ui, slot) {
    var unit = unitAt(side, ui);
    var others = side === 'player' ? state.battle.foes : state.battle.allies;
    var die = unit && unit.speedDice[slot];
    var page = slotPage(side, ui, slot);
    if (!die || !page) return '';
    var target = slotTarget(side, ui, slot);
    var foe = null;
    if (target != null) {
      var n = 0;
      for (var i = 0; i < others.length; i++) {
        if (others[i].dead) continue;
        if (target < n + others[i].speedDice.length) { foe = others[i]; target = target - n; break; }
        n += others[i].speedDice.length;
      }
    }
    var kind = '';
    if (state.phase === 'plan') {
      previewEngagements(state.battle, state.assignments, state.targets).forEach(function (row) {
        if ((row.kind === 'clash' || row.kind === 'cancel') && ((side === 'player' && row.playerUi === ui && row.player === slot) || (side === 'enemy' && row.enemyUi === ui && row.enemy === slot))) kind = row.kind;
        else if (row.kind === 'onesided' && row.side === side && row.ui === ui && row.slot === slot) kind = 'onesided';
      });
    }
    var aim = !foe || target == null || !foe.speedDice[target] ? '' :
      '<div class="intel-aim">→ ' + esc(foe.name) + 'の速度' + foe.speedDice[target].speed + 'のダイス' +
      (kind === 'clash' ? '<span class="tag clash">マッチ</span>' : kind === 'cancel' ? '<span class="tag cancel">相殺</span>' : kind === 'onesided' ? '<span class="tag ' +
        (side === 'player' ? 'mine' : 'foe') + '">一方攻撃</span>' : '') + '</div>';
    return '<div class="intel-head"><span class="cost">' + (page.kind === 'defense' || page.kind === 'matchDefense' ? '防' : '攻') + '</span><b>' + esc(page.name) + '</b></div>' +
      '<div class="intel-who">' + esc(unit.name) + ' · 速度' + die.speed + '</div>' +
      '<div class="intel-dice">' + page.dice.map(dieRange).join('') + '</div>' + aim;
  }

  function drawIntel() {
    var box = $('intel');
    var h = state.hover;
    var html = h && state.battle && !state.busy ? intelHtml(h.side, Number(h.ui), Number(h.slot)) : '';
    if (!html) { box.className = 'intel hidden'; box.innerHTML = ''; return; }
    box.innerHTML = html;
    box.className = 'intel ' + h.side;
    var c = slotCenter(h.side, h.ui, h.slot);
    var stage = $('stage');
    if (!c) return;
    var w = box.offsetWidth;
    var left = Math.max(8, Math.min(stage.clientWidth - w - 8, c.x - w / 2));
    box.style.left = left + 'px';
    box.style.top = Math.max(8, c.top - box.offsetHeight - 14) + 'px';
  }

  function drawOverlays() {
    drawArrows();
    drawIntel();
  }

  function isMeleeKind(kind) {
    return kind === 'clash' || kind === 'parry' || kind === 'onesided' || kind === 'fizzle';
  }

  function focusUi(ev, side) {
    if (!ev || !ev.focus) return -1;
    var ui = side === 'player' ? ev.focus.playerUi : ev.focus.enemyUi;
    return ui == null ? -1 : ui;
  }

  function attackersOf(ev) {
    var none = { player: [], enemy: [] };
    if (!ev) return none;
    if (ev.kind === 'clash' || ev.kind === 'parry' || ev.kind === 'cancel') {
      var ally = focusUi(ev, 'player');
      var foe = focusUi(ev, 'enemy');
      return {
        player: ally < 0 ? [] : [ally],
        enemy: foe < 0 ? [] : [foe]
      };
    }
    if (ev.kind === 'onesided' || ev.kind === 'fizzle') {
      var ui = focusUi(ev, ev.actor);
      if (ui < 0) return none;
      if (ev.actor === 'player') return { player: [ui], enemy: [] };
      if (ev.actor === 'enemy') return { player: [], enemy: [ui] };
    }
    return none;
  }

  function attackedBefore(side, ui, index) {
    for (var i = 0; i < index; i++) {
      var part = attackersOf(state.events[i]);
      if (part[side].indexOf(ui) >= 0) return true;
    }
    return false;
  }

  function needsApproach(ev) {
    if (!ev || (ev.kind !== 'clash' && ev.kind !== 'parry' && ev.kind !== 'onesided' && ev.kind !== 'cancel')) return false;
    var part = attackersOf(ev);
    var sides = ['player', 'enemy'];
    for (var s = 0; s < sides.length; s++) {
      var ids = part[sides[s]];
      for (var n = 0; n < ids.length; n++) {
        if (!attackedBefore(sides[s], ids[n], state.cursor)) return true;
      }
    }
    return false;
  }

  function unitForward(side, ui) {
    var ev = currentEvent();
    if (!ev || state.phase !== 'play') return false;
    var index = state.cursor;
    var last = isMeleeKind(ev.kind) ? index : index - 1;
    if (ev.kind !== 'clash' && ev.kind !== 'parry' && ev.kind !== 'onesided' && ev.kind !== 'fizzle' && ev.kind !== 'cancel' && ev.kind !== 'stagger' && ev.kind !== 'death') return false;
    for (var i = 0; i <= last; i++) {
      var part = attackersOf(state.events[i]);
      if (part[side].indexOf(ui) >= 0) return true;
    }
    return false;
  }

  function syncEngage(el, side, forward, rush) {
    var posed = side === 'player' ? 'translateX(288px)' : 'translateX(-288px)';
    if (!forward) {
      el.classList.remove('engage', 'rushing', 'hold');
      el.style.transition = '';
      el.style.transform = '';
      return;
    }
    el.classList.add('engage');
    el.style.transition = 'none';
    if (rush && !el.classList.contains('rushing')) {
      el.classList.remove('hold');
      el.style.transform = '';
      void el.offsetWidth;
      el.classList.add('rushing');
      return;
    }
    if (rush) return;
    el.classList.remove('rushing');
    el.classList.add('hold');
    el.style.transform = posed;
  }

  function viewBefore(index) {
    if (index > 0) return state.events[index - 1].units;
    return state.introView;
  }

  function spriteFx(unit) {
    if (!state.fxOn || state.beat !== 'resolve') return '';
    var ev = currentEvent();
    if (!ev) return '';
    if (ev.kind === 'stagger' && ev.target === unit.side && ev.ui === unit.ui) return ' broken';
    if (ev.kind === 'death' && ev.target === unit.side && ev.ui === unit.ui) return ' fall';
    var hurt = (ev.hits || []).some(function (h) {
      return h.side === unit.side && h.ui === unit.ui && h.amount > 0;
    });
    if (hurt) return ' hurt';
    var part = attackersOf(ev);
    var mine = unit.side === 'player' ? part.player : part.enemy;
    if (mine.indexOf(unit.ui) < 0) return '';
    if (ev.kind === 'parry') return ' recoil';
    if ((ev.kind === 'clash' || ev.kind === 'onesided') && ev.outcome === unit.side) return ' strike';
    if (ev.kind === 'clash') return ' recoil';
    return '';
  }

  function lowMorale(view) {
    if (!view || view.dead || view.staggered || view.staggerMax <= 0) return false;
    return view.stagger > 0 && view.stagger <= Math.floor(view.staggerMax * 0.25);
  }

  function poseKey(side, ui) { return side + ':' + ui; }

  function rememberPose(unit, key) {
    var src = unit.motions && unit.motions[key];
    var id = poseKey(unit.side, unit.ui);
    if (!src) { delete state.poses[id]; return; }
    state.poses[id] = src;
  }

  function poseFromSkill(unit, ev) {
    var type = ev.types && ev.types[unit.side];
    if (!type || !ev.focus) return;
    var ui = unit.side === 'player' ? ev.focus.playerUi : ev.focus.enemyUi;
    if (ui !== unit.ui) return;
    var slot = unit.side === 'player' ? ev.focus.player : ev.focus.enemy;
    var speedDie = slot >= 0 && unit.speedDice ? unit.speedDice[slot] : null;
    var page = speedDie && speedDie.page;
    if (page && page.motion) {
      state.poses[poseKey(unit.side, unit.ui)] = page.motion;
      return;
    }
    if (type === 'block' || type === 'evade') rememberPose(unit, 'guard');
    else if (type === 'slash' || type === 'pierce' || type === 'blunt') rememberPose(unit, type);
  }

  function updatePoses() {
    if (!state.battle || state.phase !== 'play') return;
    var ev = currentEvent();
    if (!ev) return;
    var melee = ev.kind === 'clash' || ev.kind === 'parry' || ev.kind === 'onesided' || ev.kind === 'fizzle' || ev.kind === 'cancel';
    state.battle.allies.concat(state.battle.foes).forEach(function (unit) {
      var part = attackersOf(ev);
      var mine = unit.side === 'player' ? part.player : part.enemy;
      var acting = mine.indexOf(unit.ui) >= 0;
      if (state.beat === 'approach' && acting && !attackedBefore(unit.side, unit.ui, state.cursor)) {
        rememberPose(unit, 'move');
        return;
      }
      if (state.beat !== 'resolve' || !melee) return;
      var hurt = (ev.hits || []).some(function (h) {
        return h.side === unit.side && h.ui === unit.ui && h.amount > 0;
      });
      if (hurt) { rememberPose(unit, 'hit'); return; }
      poseFromSkill(unit, ev);
    });
  }

  function figureHtml(unit) {
    var view = shownOf(unit);
    var cls = 'sprite' + spriteFx(unit);
    if (view.staggered) cls += ' is-staggered';
    if (view.dead) cls += ' is-dead';
    var morale = lowMorale(view)
      ? '<div class="morale" aria-label="士気低下"><span>士気低下</span></div>'
      : '';
    var src = state.poses[poseKey(unit.side, unit.ui)] || unit.portrait;
    return slotHtml(unit, state.phase === 'plan' && unit.side === 'player') +
      '<div class="' + cls + '" data-act="sheet" data-side="' + unit.side + '" data-ui="' + unit.ui + '" role="button" aria-label="' + esc(unit.name) + 'の詳細">' +
      morale +
      '<img src="' + esc(src) + '" alt="" onerror="this.classList.add(\'fail\')">' +
      '<div class="stand">' + esc(unit.name.slice(0, 1)) + '</div></div>' +
      footBuffs(unit) +
      '<div class="ring"></div>';
  }

  function shownStatus(unit) {
    if (state.phase === 'play' || state.phase === 'over') {
      var view = shownOf(unit);
      if (view && view.status) return view.status;
    }
    return unit.status || {};
  }

  function statusIcon(key) {
    var info = STATUS_INFO[key];
    return 'assets/ui/status/' + ((info && info.icon) || (key + '.png'));
  }

  function footBuffs(unit) {
    var status = shownStatus(unit);
    var icons = Object.keys(STATUS_INFO).filter(function (key) {
      return status[key] > 0;
    }).map(function (key) {
      var info = STATUS_INFO[key];
      return '<span class="footbuff" title="' + esc(info.name) + '">' +
        '<img src="' + statusIcon(key) + '" alt="' + esc(info.name) + '" onerror="this.classList.add(\'fail\')">' +
        '<b>' + status[key] + '</b></span>';
    }).join('');
    return icons ? '<div class="footbuffs">' + icons + '</div>' : '';
  }

  function plateHtml(unit) {
    var view = shownOf(unit);
    return '<div class="plate-art">' +
      '<img class="stateshead" src="' + esc(unit.stateshead) + '" alt="" onerror="this.classList.add(\'fail\')">' +
      bar(unit, 'hp', view.hp, view.hpMax) +
      bar(unit, 'stagger', view.stagger, view.staggerMax) +
      '<img class="statusframe" src="assets/ui/Status_frame.png" alt="">' +
      '<h2>' + esc(unit.name) + '</h2>' +
      '<b class="hpnum"><span>' + view.hp + '/' + view.hpMax + '</span></b>' +
      '<b class="stagnum"><span>' + view.stagger + '/' + view.staggerMax + '</span></b>' +
      '</div>';
  }

  var OFFENSE_DICE = ['slash', 'pierce', 'blunt'];

  function randomOffenseIcon() {
    return DICE_ICON[OFFENSE_DICE[Math.floor(Math.random() * OFFENSE_DICE.length)]];
  }

  function skillHex(skill, ui, slot, place) {
    if (state.rolling) {
      return '<span class="iconbtn ' + place + ' rolling" aria-hidden="true">' +
        '<img class="rollface" src="' + randomOffenseIcon() + '" alt=""></span>';
    }
    var tone = skill.dice[0].type;
    var picked = state.assignments[ui] && state.assignments[ui][slot] === skill.id;
    var aiming = state.aiming && state.aiming.ui === ui && state.aiming.slot === slot && state.aiming.skill === skill.id;
    var cls = 'iconbtn ' + place + (picked ? ' set' : '') + (aiming ? ' aiming' : '');
    return '<button type="button" class="' + cls + '" data-act="pick" data-ui="' + ui + '" data-slot="' + slot + '" data-skill="' + skill.id + '" aria-label="' + esc(skill.name) + '">' +
      '<img src="' + esc(skill.icon) + '" alt="" onerror="this.classList.add(\'fail\')">' +
      '<b class="fallback">' + DIE_SHORT[tone] + '</b></button>';
  }

  function duelHtml(ev) {
    if (!ev.rolls || state.beat !== 'resolve') return '';
    function face(side) {
      var roll = ev.rolls[side];
      if (roll == null) return '<div class="face none"></div>';
      var type = ev.types[side];
      var cls = 'face ' + type;
      if (ev.kind === 'parry' || ev.outcome === 'tie') cls += ' tie';
      else cls += ev.outcome === side ? ' win' : ' lose';
      return '<div class="' + cls + '">' + dieIcon(type) + '<b>' + roll + '</b><span>' + DIE_LABEL[type] + '</span></div>';
    }
    var spark = ev.kind === 'parry'
      ? '<i class="parryfx" aria-hidden="true"><i class="blade a"></i><i class="blade b"></i><i class="spark"></i></i>'
      : '';
    return '<div class="duel' + (state.fxOn ? ' anim' : '') + '">' + face('player') +
      '<span class="duelvs">' + (ev.kind === 'clash' || ev.kind === 'parry' ? '対' : '') + '</span>' + face('enemy') +
      spark + '</div>';
  }

  function renderCenter() {
    if (state.phase === 'plan') {
      $('center').innerHTML = '';
      return;
    }
    var ev = state.events[state.cursor];
    if (!ev || state.beat === 'approach') { $('center').innerHTML = ''; return; }
    $('center').innerHTML = duelHtml(ev);
  }

  function renderHand() {
    if (state.phase === 'over') {
      var winner = state.battle.winner;
      var text = winner === 'player' ? '味方の勝ち。' : winner === 'enemy' ? '相手の勝ち。' : '相打ち。';
      $('handbar').innerHTML = '<p class="stage-text ' + (winner === 'player' ? 'win' : 'bad') + '">' + esc(text) + '</p>' +
        '<div class="actions"><button type="button" data-act="restart">選択に戻る</button></div>';
      return;
    }
    if (state.phase === 'play') {
      var last = state.cursor >= state.events.length - 1;
      var nextLabel = last ? (state.battle.over ? '結果を見る' : '次の幕へ') : '次の判定';
      $('handbar').innerHTML = '<div class="actions">' +
        '<button type="button" data-act="pause">' + (state.paused ? '再開' : '一時停止') + '</button>' +
        '<button type="button" class="primary" data-act="next">' + nextLabel + '</button>' +
        (last ? '' : '<button type="button" data-act="all">最後まで</button>') + '</div>';
      return;
    }
    var aiming = state.aiming;
    var hint = state.note
      ? '<p class="err">' + esc(state.note) + '</p>'
      : (aiming
        ? '<p class="plan-note">「' + findSkill(unitAt('player', aiming.ui), aiming.skill).name + '」を選択中。相手の速度ダイスを押すと、そのスキルと狙いが決まります。</p>'
        : '');
    var groups = state.battle.allies.map(function (player) {
      if (player.dead) return '';
      var dazed = player.staggered;
      var cols = player.speedDice.map(function (die, i) {
        var on = (state.selected && state.selected.ui === player.ui && state.selected.slot === i) || (aiming && aiming.ui === player.ui && aiming.slot === i);
        var shown = die.offers.map(function (id, n) {
          if (n === 1 && state.guard[player.ui] && state.guard[player.ui][i]) return player.defense;
          return findSkill(player, id);
        });
        var hexes = shown.map(function (skill, n) {
          return skillHex(skill, player.ui, i, n === 0 ? 'a' : 'b');
        }).join('');
        return '<div class="skillcol' + (on ? ' on' : '') + (dazed ? ' dazed' : '') + '">' +
          '<img class="frame" src="assets/ui/frame.png" alt="">' +
          '<button type="button" class="head' + (state.guard[player.ui] && state.guard[player.ui][i] ? ' on' : '') + '" data-act="guard" data-ui="' + player.ui + '" data-slot="' + i + '" aria-label="' + (state.guard[player.ui] && state.guard[player.ui][i] ? '元のスキルに戻す' : '通常の防御スキルに替える') + '">' +
          '<img src="' + esc(player.head) + '" alt="" onerror="this.classList.add(\'fail\')"></button>' +
          hexes + '<b class="spd">' + (state.rolling ? '·' : die.speed) + '</b></div>';
      }).join('');
      return '<div class="party"><div class="skillrow">' + cols + '</div></div>';
    }).join('');
    $('handbar').innerHTML = hint + '<div class="parties">' + groups +
      '<button type="button" class="gear" data-act="confirm" aria-label="決定"><img src="assets/ui/gear.png" alt="" onerror="this.classList.add(\'fail\')"></button></div>';
  }

  function renderEnemyHand() {
    if (!state.battle) { $('enemyHand').innerHTML = ''; return; }
    $('enemyHand').innerHTML = '<div class="enemyhand">' + state.battle.foes.map(function (unit) {
      var skills = unit.attacks.slice();
      if (unit.defense) skills.push(unit.defense);
      return '<p class="who">' + esc(unit.name) + '</p>' + skills.map(function (skill) {
        return '<div class="skillchip ' + (skill.attr || skill.dice[0].type) + '"><b>' + esc(skill.name) +
          (skill.kind === 'defense' ? '（通常の防御）' : skill.kind === 'matchDefense' ? '（マッチ可能防御）' : '') + '</b>' + skillBody(skill) + '</div>';
      }).join('');
    }).join('') + '</div>';
  }

  function renderWing(id, units, side) {
    var wing = $(id);
    var cls = side === 'player' ? 'left' : 'right';
    var same = wing.children.length === units.length;
    if (same) {
      for (var i = 0; i < units.length; i++) {
        if (wing.children[i].getAttribute('data-ui') !== String(units[i].ui)) same = false;
      }
    }
    if (!same) {
      wing.innerHTML = units.map(function (unit, i) {
        return '<section class="actor ' + cls + ' form-' + (i + 1) + '" data-side="' + side + '" data-ui="' + unit.ui + '"></section>';
      }).join('');
    }
    units.forEach(function (unit, i) {
      var el = wing.children[i];
      el.classList.remove('form-1', 'form-2', 'form-3', 'form-4', 'form-5');
      el.classList.add('form-' + (i + 1));
      el.innerHTML = figureHtml(unit);
    });
  }

  function renderPlates(id, units, side) {
    $(id).innerHTML = units.map(function (unit, i) {
      var dead = shownOf(unit).dead ? ' ko' : '';
      return '<div class="plate form-' + (i + 1) + (side === 'enemy' ? ' right' : '') + dead + '">' + plateHtml(unit) + '</div>';
    }).join('');
  }

  function settleBars() {
    var spans = document.querySelectorAll('.bar span[data-to]');
    if (!spans.length) return;
    void document.body.offsetWidth;
    for (var i = 0; i < spans.length; i++) spans[i].style.width = spans[i].getAttribute('data-to') + '%';
  }

  function render(withFx) {
    if (!state.battle) return;
    state.fxOn = !!withFx;
    updatePoses();
    $('turnLine').textContent = '第' + state.battle.scene + '幕';
    renderWing('allyWing', state.battle.allies, 'player');
    renderWing('foeWing', state.battle.foes, 'enemy');
    renderPlates('allyPlates', state.battle.allies, 'player');
    renderPlates('foePlates', state.battle.foes, 'enemy');
    var ev = currentEvent();
    var allyNodes = document.querySelectorAll('#allyWing .actor');
    var foeNodes = document.querySelectorAll('#foeWing .actor');
    function pose(nodes, side) {
      for (var i = 0; i < nodes.length; i++) {
        var ui = Number(nodes[i].getAttribute('data-ui'));
        var forward = unitForward(side, ui);
        var part = attackersOf(ev);
        var acting = part[side].indexOf(ui) >= 0;
        var rush = !!(ev && state.beat === 'approach' && acting && !attackedBefore(side, ui, state.cursor));
        syncEngage(nodes[i], side, forward, rush);
      }
    }
    pose(allyNodes, 'player');
    pose(foeNodes, 'enemy');
    renderCenter();
    renderHand();
    renderEnemyHand();
    settleBars();
    drawOverlays();
    renderSheet();
    state.fxOn = false;
    state.flashSlot = null;
    state.landed = false;
    if (!state.rolling) state.fresh = {};
  }

  function retrigger(el, cls) {
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
  }

  function popup(side, ui, text, sub, cls) {
    var stage = $('stage');
    var sprite = document.querySelector('.actor[data-side="' + side + '"][data-ui="' + ui + '"] .sprite');
    if (!sprite) return;
    var box = localRect(sprite, stage);
    var el = document.createElement('div');
    el.className = 'pop ' + (cls || '');
    var outer = side === 'player' ? 0.12 : 0.88;
    el.style.left = (box.left + box.width * outer + (Math.random() * 24 - 12)) + 'px';
    el.style.top = (box.top + box.height * 0.28) + 'px';
    el.innerHTML = (sub ? '<span>' + esc(sub) + '</span>' : '') + '<b>' + esc(text) + '</b>';
    $('fx').appendChild(el);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 1500);
  }

  function playFx(ev) {
    var big = false;
    (ev.hits || []).forEach(function (hit) {
      var cls = hit.amount <= 0 ? 'zero' : (hit.key === 'fatal' || hit.key === 'weak') ? 'crit' : hit.key === 'endured' ? 'endured' : '';
      popup(hit.side, hit.ui, String(hit.amount), hit.label || (hit.amount > 0 ? (RES_LABEL[hit.key] || '') : ''), cls);
      if (hit.amount > 0) hitBurst(hit.side, hit.ui);
      if (hit.amount >= 8 || hit.key === 'fatal') big = true;
    });
    if (ev.kind === 'stagger') { popup(ev.target, ev.ui, '混乱', '', 'stag'); big = true; }
    if (ev.kind === 'cancel' || (ev.kind === 'clash' && ev.outcome === 'tie')) popup('player', ev.focus ? ev.focus.playerUi : 0, '相殺', '', 'tie');
    if ((ev.hits || []).length || ev.kind === 'stagger') retrigger($('stage'), big ? 'shake-big' : 'shake');
  }

  function banner(main, sub, cls, done) {
    var el = $('banner');
    var finished = false;
    var timer = null;
    function close() {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      el.className = 'banner';
      el.innerHTML = '';
      el.onclick = null;
      if (done) done();
    }
    el.innerHTML = '<div class="banner-inner"><span class="banner-sub">' + esc(sub) + '</span>' +
      '<strong>' + esc(main) + '</strong><i class="banner-rule"></i></div>';
    el.className = 'banner on ' + (cls || '');
    el.onclick = close;
    timer = setTimeout(close, BANNER_MS);
  }

  function rollSpeeds(done) {
    var nodes = document.querySelectorAll('.slot b, .skillcol .spd');
    var faces = document.querySelectorAll('.rollface');
    var ticks = 0;
    var iv = setInterval(function () {
      ticks += 1;
      for (var i = 0; i < nodes.length; i++) nodes[i].textContent = 1 + Math.floor(Math.random() * 6);
      for (var f = 0; f < faces.length; f++) faces[f].src = randomOffenseIcon();
      if (ticks < 10) return;
      clearInterval(iv);
      state.rolling = false;
      state.landed = true;
      render();
      if (done) done();
    }, 50);
  }

  function openScene(logs, held) {
    clearTimeout(state.timer);
    state.phase = 'plan';
    state.view = null;
    state.introView = null;
    state.beat = 'resolve';
    state.poses = {};
    state.loggedAt = -1;
    state.focus = { player: -1, enemy: -1 };
    state.assignments = state.battle.allies.map(function (unit) {
      return unit.speedDice.map(function () { return null; });
    });
    state.targets = state.battle.allies.map(function (unit) {
      return unit.speedDice.map(function () { return null; });
    });
    state.guard = state.battle.allies.map(function (unit) {
      return unit.speedDice.map(function () { return false; });
    });
    state.aiming = null;
    state.hover = null;
    state.selected = { ui: 0, slot: 0 };
    state.note = '';
    state.fresh = {};
    state.busy = true;
    state.rolling = true;
    logs.forEach(function (line) { logLine(line.text, line.cls); });
    render();
    var intro = ++state.intro;
    var curtain = $('curtain');
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function showTitle() {
      if (state.intro !== intro) return;
      banner('第' + state.battle.scene + '幕', 'SCENE', '', function () {
        if (state.intro !== intro) return;
        rollSpeeds(function () {
          state.busy = false;
          render();
        });
      });
    }
    function finishOpen() {
      if (state.intro !== intro) return;
      if (curtain) curtain.style.pointerEvents = '';
      if (!state.curtain && curtain) curtain.className = 'curtain';
      showTitle();
    }
    if (!held || reduce || !curtain) { showTitle(); return; }
    curtain.className = 'curtain opening';
    setTimeout(finishOpen, 760);
  }

  function showSetup() {
    clearTimeout(state.timer);
    state.phase = 'setup';
    state.battle = null;
    state.view = null;
    state.busy = false;
    state.rolling = false;
    state.beat = 'resolve';
    state.introView = null;
    state.loggedAt = -1;
    state.intro += 1;
    state.leaving = false;
    resetCurtain();
    $('banner').className = 'banner';
    $('fx').innerHTML = '';
    $('arrows').innerHTML = '';
    $('center').innerHTML = '';
    $('intel').className = 'intel hidden';
    state.hover = null;
    state.sheet = null;
    $('sheet').className = 'sheet hidden';
    $('sheet').innerHTML = '';
    $('setup').classList.remove('hidden');
    $('field').classList.add('hidden');
    document.querySelector('.stage-bg').classList.remove('battle-bg');
    $('log').innerHTML = '';
    renderSetup();
  }

  function unitImageSrcs(def) {
    var list = [];
    function add(src) { if (src) list.push(src); }
    add(def.portrait);
    add(def.head);
    add(def.stateshead);
    if (def.mind) add(def.mind.icon);
    var motions = def.motions || {};
    Object.keys(motions).forEach(function (key) { add(motions[key]); });
    (def.attacks || []).concat(def.defense ? [def.defense] : []).forEach(function (skill) {
      add(skill.art);
      add(skill.icon);
      add(skill.motion);
    });
    return list;
  }

  function preloadImages(srcs, done) {
    var seen = {};
    var unique = [];
    srcs.forEach(function (src) {
      if (!src || seen[src]) return;
      seen[src] = true;
      unique.push(src);
    });
    var pending = unique.length;
    var finished = false;
    function finish() {
      if (finished) return;
      finished = true;
      done();
    }
    if (!pending) { finish(); return; }
    var timer = setTimeout(finish, 8000);
    function one() {
      pending -= 1;
      if (pending > 0) return;
      clearTimeout(timer);
      finish();
    }
    unique.forEach(function (src) {
      var img = new Image();
      var settled = false;
      function settle() {
        if (settled) return;
        settled = true;
        one();
      }
      function loaded() {
        if (img.decode) img.decode().then(settle, settle);
        else settle();
      }
      img.onload = loaded;
      img.onerror = settle;
      img.src = src;
      if (img.complete) {
        img.onload = null;
        img.onerror = null;
        if (img.naturalWidth) loaded();
        else settle();
      }
    });
  }

  function startBattle() {
    if (state.phase !== 'setup' || state.leaving) return;
    var pack = chosenTeams();
    if (state.meSlot == null || state.foeSlot == null || !pack.allies.length || !pack.foes.length || shares(pack.allies, pack.foes)) return;
    state.leaving = true;
    var stamp = ++state.intro;
    var curtain = $('curtain');
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var srcs = [];
    pack.allies.concat(pack.foes).forEach(function (id) {
      if (ROSTER[id]) srcs = srcs.concat(unitImageSrcs(ROSTER[id]));
    });
    var imagesReady = false;
    var curtainReady = reduce || !curtain;
    function tryEnter() {
      if (!imagesReady || !curtainReady || state.intro !== stamp) return;
      enter();
    }
    preloadImages(srcs, function () {
      imagesReady = true;
      tryEnter();
    });
    function enter() {
      if (state.intro !== stamp) return;
      state.leaving = false;
      state.battle = createBattle(pack.allies, pack.foes);
      state.events = [];
      state.cursor = 0;
      state.paused = false;
      state.barPct = {};
      $('log').innerHTML = '';
      $('fx').innerHTML = '';
      var logs = beginScene(state.battle);
      $('setup').classList.add('hidden');
      $('field').classList.remove('hidden');
      document.querySelector('.stage-bg').classList.add('battle-bg');
      openScene(logs, !reduce && !!curtain);
    }
    if (!curtainReady) {
      curtain.style.pointerEvents = 'auto';
      curtain.className = 'curtain closing';
      state.timer = setTimeout(function () {
        if (state.intro !== stamp) return;
        if (curtain) curtain.className = 'curtain shut';
        curtainReady = true;
        tryEnter();
      }, 520);
    }
  }

  function enemyJustFell() {
    var ev = state.events[state.cursor];
    if (!(ev && ev.kind === 'death' && ev.target === 'enemy' && state.battle && state.battle.winner === 'player')) return false;
    for (var i = state.cursor + 1; i < state.events.length; i++) {
      if (state.events[i].kind === 'death' && state.events[i].target === 'enemy') return false;
    }
    return true;
  }

  function leaveToTitle() {
    document.body.classList.add('locked');
    var curtain = $('curtain');
    if (curtain) curtain.style.pointerEvents = 'auto';
    var bannerEl = $('banner');
    if (bannerEl) bannerEl.onclick = null;
    state.timer = setTimeout(function () {
      try { sessionStorage.setItem('titleCurtain', '1'); } catch (err) {}
      window.location.href = 'index.html';
    }, 800);
  }

  function resetCurtain() {
    state.curtain = false;
    var curtain = $('curtain');
    if (!curtain) return;
    curtain.style.pointerEvents = '';
    curtain.className = 'curtain';
  }

  function playVictoryCurtain() {
    if (state.curtain || !state.battle || state.battle.winner !== 'player') return;
    state.curtain = true;
    clearTimeout(state.timer);
    while (state.cursor < state.events.length - 1) {
      state.cursor += 1;
      if (state.loggedAt !== state.cursor) {
        state.loggedAt = state.cursor;
        logLine(state.events[state.cursor].text, state.events[state.cursor].cls);
      }
    }
    var curtain = $('curtain');
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      curtain.className = 'curtain shut';
      finishPlayback();
      return;
    }
    curtain.className = 'curtain closing';
    state.timer = setTimeout(function () {
      curtain.className = 'curtain shut';
      finishPlayback();
    }, 520);
  }

  function schedule() {
    clearTimeout(state.timer);
    if (state.curtain || state.paused || state.phase !== 'play') return;
    if (enemyJustFell()) {
      state.timer = setTimeout(playVictoryCurtain, 900);
      return;
    }
    var ev = state.events[state.cursor];
    state.timer = setTimeout(onNext, (ev && WAIT[ev.kind]) || 1100);
  }

  function hitBurst(side, ui) {
    var stage = $('stage');
    var sprite = document.querySelector('.actor[data-side="' + side + '"][data-ui="' + ui + '"] .sprite');
    if (!stage || !sprite) return;
    var box = localRect(sprite, stage);
    var el = document.createElement('div');
    el.className = 'hitburst';
    el.style.left = (box.left + box.width * 0.55) + 'px';
    el.style.top = (box.top + box.height * 0.46) + 'px';
    var shards = '';
    for (var i = 0; i < 10; i++) {
      shards += '<i class="shard" style="--a:' + ((i / 10) * 360) + 'deg;--d:' + (42 + (i % 3) * 18) + 'px"></i>';
    }
    el.innerHTML = '<i class="flash"></i><i class="ring"></i><i class="arc"></i>' + shards;
    $('fx').appendChild(el);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 700);
  }

  function impactFlash() {
    var sprites = document.querySelectorAll('.actor.rushing .sprite');
    for (var i = 0; i < sprites.length; i++) {
      sprites[i].classList.remove('collide');
      void sprites[i].offsetWidth;
      sprites[i].classList.add('collide');
    }
    retrigger($('stage'), 'shake');
  }

  function resolveBeat() {
    if (state.phase !== 'play') return;
    var ev = state.events[state.cursor];
    if (!ev) return;
    state.beat = 'resolve';
    state.view = ev.units;
    state.focus = ev.focus || { player: -1, enemy: -1 };
    if (state.loggedAt !== state.cursor) {
      state.loggedAt = state.cursor;
      logLine(ev.text, ev.cls);
    }
    render(true);
    if (ev.kind === 'parry') { playParry(); return; }
    playFx(ev);
    schedule();
  }

  function clearSpin() {
    if (state.spin) { clearInterval(state.spin); state.spin = null; }
  }

  function spinFaces(done) {
    clearSpin();
    var duel = document.querySelector('#center .duel');
    var nodes = document.querySelectorAll('#center .duel .face b');
    if (duel) duel.classList.add('spinning');
    var ticks = 0;
    state.spin = setInterval(function () {
      ticks += 1;
      for (var i = 0; i < nodes.length; i++) nodes[i].textContent = String(1 + Math.floor(Math.random() * 8));
      if (ticks < 8) return;
      clearSpin();
      if (done) done();
    }, 55);
  }

  function playParry() {
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || state.paused) { schedule(); return; }
    state.timer = setTimeout(function () {
      if (state.paused || state.phase !== 'play') return;
      spinFaces(function () { onNext(); });
    }, 460);
  }

  function applyCursor() {
    var ev = state.events[state.cursor];
    state.focus = ev.focus || { player: -1, enemy: -1 };
    clearTimeout(state.timer);
    if (needsApproach(ev)) {
      state.beat = 'approach';
      state.view = viewBefore(state.cursor);
      render(false);
      if (state.paused) return;
      state.timer = setTimeout(function () {
        impactFlash();
        state.timer = setTimeout(resolveBeat, IMPACT_MS);
      }, APPROACH_MS);
      return;
    }
    resolveBeat();
  }

  function finishPlayback() {
    clearTimeout(state.timer);
    if (state.battle.over) {
      state.phase = 'over';
      if (state.events.length) state.view = state.events[state.events.length - 1].units;
      state.focus = { player: -1, enemy: -1 };
      render();
      var winner = state.battle.winner;
      if (winner === 'player' && state.curtain) {
        banner('勝利', '戦闘終了', 'win', leaveToTitle);
        return;
      }
      banner(winner === 'player' ? '勝利' : winner === 'enemy' ? '敗北' : '相打ち', '戦闘終了',
        winner === 'player' ? 'win' : 'lose');
      return;
    }
    var logs = beginScene(state.battle);
    openScene(logs);
  }

  function onConfirm() {
    state.hover = null;
    state.introView = snap(state.battle);
    var plans = state.battle.allies.map(function (unit, ui) {
      return { ids: state.assignments[ui] || [], targets: state.targets[ui] || [] };
    });
    var res = confirmScene(state.battle, plans);
    if (res.error) { state.note = res.error; state.introView = null; render(); return; }
    state.events = res.events;
    state.cursor = 0;
    state.loggedAt = -1;
    state.beat = 'resolve';
    state.note = '';
    state.phase = 'play';
    state.paused = false;
    if (!state.events.length) { finishPlayback(); return; }
    applyCursor();
  }

  function onNext() {
    clearTimeout(state.timer);
    clearSpin();
    if (state.curtain || state.phase !== 'play') return;
    if (state.beat === 'approach') { resolveBeat(); return; }
    if (enemyJustFell()) { playVictoryCurtain(); return; }
    if (state.cursor < state.events.length - 1) { state.cursor += 1; applyCursor(); return; }
    finishPlayback();
  }

  function playAll() {
    clearTimeout(state.timer);
    clearSpin();
    while (state.cursor < state.events.length - 1) {
      state.cursor += 1;
      if (state.loggedAt !== state.cursor) {
        state.loggedAt = state.cursor;
        logLine(state.events[state.cursor].text, state.events[state.cursor].cls);
      }
    }
    var ev = state.events[state.cursor];
    state.beat = 'resolve';
    state.view = ev.units;
    state.focus = ev.focus || { player: -1, enemy: -1 };
    render();
    if (state.battle && state.battle.winner === 'player' && state.events.some(function (ev) {
      return ev.kind === 'death' && ev.target === 'enemy';
    })) {
      playVictoryCurtain();
      return;
    }
    schedule();
  }

  var ATTR_FILE = { slash: 'slash', pierce: 'pierce', blunt: 'blunt', block: 'block', evade: 'Evasion' };

  function attackAttr(skill) {
    if (skill && ATTR_FILE[skill.attr]) return skill.attr;
    if (!skill || !skill.dice[0]) return '';
    return ATTR_FILE[skill.dice[0].type] ? skill.dice[0].type : '';
  }

  function resistSlot(unit, view) {
    var resist = view.staggered
      ? { slash: 'fatal', pierce: 'fatal', blunt: 'fatal' }
      : (view.resist || unit.resist);
    return '<div class="sheet-bars">' +
      '<div class="resistslot">' +
      '<img class="resistframe" src="assets/ui/Resistance_slot.png" alt="">' +
      '<div class="resistrow">' + ['slash', 'pierce', 'blunt'].map(function (type) {
        var key = resist[type] || 'normal';
        var mult = RES_MULT[key];
        var factor = mult === 0.5 ? '0.5' : mult === 1.5 ? '1.5' : String(mult);
        return '<div class="resistitem ' + key + '">' +
          '<img src="assets/ui/Attack_attribute/' + type + '.png" alt="' + DIE_LABEL[type] + '">' +
          '<span><b>' + RES_LABEL[key] + '</b><i>(x' + factor + ')</i></span></div>';
      }).join('') + '</div></div>' + buffSlot(unit) + '</div>';
  }

  function statusLines(info) {
    if (info.lines && info.lines.length) return info.lines.slice();
    var text = info.text || '';
    var tick = text.indexOf('[1幕]') === 0;
    var body = text.replace(/^\[1幕\]\s*/, '');
    var lines = [];
    if (body) lines.push(body);
    if (tick) lines.push('1幕の開始時に1減少');
    return lines;
  }

  function buffPop(key, count) {
    var info = STATUS_INFO[key];
    return '<div class="buffpop" role="dialog" aria-label="' + esc(info.name) + '">' +
      '<div class="buffpop-head">' +
        '<img src="' + statusIcon(key) + '" alt="" onerror="this.classList.add(\'fail\')">' +
        '<b>' + esc(info.name) + '</b>' +
        '<span class="buffpop-stack">スタック <strong>' + count + '</strong></span>' +
      '</div>' +
      '<ul>' + statusLines(info).map(function (line) {
        return '<li>' + esc(line) + '</li>';
      }).join('') + '</ul></div>';
  }

  function buffSlot(unit) {
    var open = state.sheet && state.sheet.buff;
    if (open && !(unit.status && unit.status[open] > 0)) open = null;
    var icons = Object.keys(STATUS_INFO).filter(function (key) {
      return unit.status && unit.status[key] > 0;
    }).map(function (key) {
      var info = STATUS_INFO[key];
      return '<button type="button" class="bufficon' + (open === key ? ' on' : '') + '" data-act="buff" data-status="' + key + '" aria-label="' + esc(info.name) + '">' +
        '<img src="' + statusIcon(key) + '" alt="" onerror="this.classList.add(\'fail\')">' +
        '<b>' + unit.status[key] + '</b></button>';
    }).join('');
    return '<div class="buffslot">' +
      (open ? buffPop(open, unit.status[open]) : '') +
      '<img class="buffframe" src="assets/ui/BuffDebuff_slots.png" alt="">' +
      '<div class="buffrow">' + icons + '</div></div>';
  }

  function termInfo(kind, key) {
    return kind === 'effect' ? EFFECT_INFO[key] : STATUS_INFO[key];
  }

  function termIcon(kind, key) {
    if (kind === 'status') return statusIcon(key);
    var info = EFFECT_INFO[key];
    return 'assets/ui/status/' + (info && info.icon ? info.icon : '');
  }

  function termHtml(text) {
    var words = [
      ['弾丸-灼熱推進弾', 'status', 'scorchAmmo'],
      ['ダメージ量減少', 'status', 'damageDown'],
      ['ダメージ量増加', 'status', 'damageUp'],
      ['振動-灼熱', 'status', 'tremorScorch'],
      ['灼熱推進弾', 'status', 'scorchAmmo'],
      ['振動爆発', 'effect', 'tremorBurst'],
      ['破裂爆発', 'effect', 'ruptureBurst'],
      ['振幅変換', 'effect', 'amplitude'],
      ['弾倉変換', 'effect', 'magazine'],
      ['呼吸', 'status', 'breath'],
      ['沈潜', 'status', 'sinking'],
      ['破裂', 'status', 'rupture'],
      ['火傷', 'status', 'burn'],
      ['振動', 'status', 'tremor']
    ];
    var html = '';
    var i = 0;
    while (text && i < text.length) {
      var hit = null;
      for (var n = 0; n < words.length; n++) {
        if (text.indexOf(words[n][0], i) === i) { hit = words[n]; break; }
      }
      if (!hit) {
        var next = text.length;
        for (var k = 0; k < words.length; k++) {
          var at = text.indexOf(words[k][0], i);
          if (at >= 0 && at < next) next = at;
        }
        html += esc(text.slice(i, next));
        i = next;
        continue;
      }
      var info = termInfo(hit[1], hit[2]);
      html += '<span class="term"><img src="' + termIcon(hit[1], hit[2]) + '" alt="" onerror="this.classList.add(\'fail\')">' +
        '<button type="button" class="term-link" data-term-kind="' + hit[1] + '" data-term="' + hit[2] + '">' +
        esc(hit[0]) + '</button></span>';
      i += hit[0].length;
    }
    return html;
  }

  function skillBody(skill) {
    var use = skill.text ? '<p class="skilluse">' + termHtml(skill.text) + '</p>' : '';
    var dice = skill.dice.map(function (die) {
      var face = die.roll
        ? DIE_LABEL[die.type] + ' ' + die.roll
        : DIE_LABEL[die.type] + ' ' + die.min + '–' + die.max;
      var extra = die.text ? '：' + termHtml(die.text) : '';
      return '<li><b>' + esc(face) + '</b>' + extra + '</li>';
    }).join('');
    return use + '<ul class="skilldice">' + dice + '</ul>';
  }

  function diceLine(skill) {
    return skill.dice.map(function (die) {
      return DIE_SHORT[die.type] + ' ' + die.min + '–' + die.max;
    }).join(' / ');
  }

  function sheetSkills(unit) {
    var list = unit.attacks.slice();
    if (unit.defense) list.push(unit.defense);
    return list;
  }

  function renderSheet() {
    var el = $('sheet');
    if (!el) return;
    if (!state.battle || !state.sheet) {
      el.className = 'sheet hidden';
      el.innerHTML = '';
      return;
    }
    var unit = unitAt(state.sheet.side, state.sheet.ui);
    var view = shownOf(unit);
    var tab = state.sheet.tab || 'skills';
    var skills = sheetSkills(unit);
    var pick = state.sheet.pick || 0;
    if (pick < 0 || pick >= skills.length) pick = 0;
    var hpPct = view.hpMax <= 0 ? 0 : Math.max(0, Math.min(100, view.hp / view.hpMax * 100));
    var sanPct = view.staggerMax <= 0 ? 0 : Math.max(0, Math.min(100, view.stagger / view.staggerMax * 100));
    var page = '';
    if (tab === 'skills') {
      page = !skills.length ? '<p class="sheet-empty">スキルは未設定</p>' : '<div class="skillgrid">' + skills.map(function (skill, i) {
        var attr = attackAttr(skill);
        var mark = attr
          ? '<img class="attr" src="assets/ui/Attack_attribute/' + ATTR_FILE[attr] + '.png" alt="' + DIE_LABEL[attr] + '">'
          : '';
        return '<button type="button" class="skillcard' + (i === pick ? ' on' : '') + '" data-act="sheet-skill" data-pick="' + i + '">' +
          '<span class="skillart ' + (attr || 'defense') + '">' +
          '<img class="skillicon" src="' + esc(skill.icon) + '" alt="" onerror="this.classList.add(\'fail\')">' + mark + '</span>' +
          '<b>' + esc(skill.name) + '</b></button>';
      }).join('') + '</div>' +
        '<div class="skilldetail"><b>' + esc(skills[pick].name) + '</b>' + skillBody(skills[pick]) + '</div>';
    } else if (tab === 'passive') {
      var list = unit.passives || [];
      page = list.length
        ? '<ul class="passives">' + list.map(function (item) {
          return '<li><b>' + esc(item.name) + '</b><span>' + termHtml(item.text) + '</span></li>';
        }).join('') + '</ul>'
        : '<p class="sheet-empty">パッシブはない</p>';
    } else {
      var mind = unit.mind;
      page = '<div class="mind">' +
        '<img class="mind-icon" src="' + esc(mind.icon) + '" alt="">' +
        '<h3>' + esc(mind.name) + '</h3>' +
        '<section><b>士気低下効果</b><span>精神力25%以下</span><p>' + esc(mind.low) + '</p></section>' +
        '<hr>' +
        '<section><b>混乱効果</b><span>精神力0</span><p>' + esc(mind.breakText) + '</p></section>' +
        '</div>';
    }
    function tabBtn(id, file, label) {
      var face = tab === id ? 'selected' : 'normal';
      return '<button type="button" class="sheet-tab ' + id + (tab === id ? ' on' : '') + '" data-act="sheet-tab" data-tab="' + id + '" aria-label="' + label + '">' +
        '<img src="assets/character_ui_parts/tab_' + file + '_' + face + '.png" alt=""></button>';
    }
    el.className = 'sheet ' + (unit.side === 'player' ? 'right' : 'left');
    el.innerHTML =
      '<div class="sheet-frame">' +
        '<img class="sheet-head" src="' + esc(unit.head) + '" alt="" onerror="this.classList.add(\'fail\')">'+
        '<div class="sheet-fill hp"><span style="width:' + hpPct.toFixed(1) + '%"></span></div>' +
        '<div class="sheet-fill san"><span style="width:' + sanPct.toFixed(1) + '%"></span></div>' +
        '<img class="sheet-content" src="assets/character_ui_parts/content_panel.png" alt="">' +
        '<img class="sheet-main" src="assets/character_ui_parts/main_panel.png" alt="">' +
        '<p class="sheet-office">' + esc(unit.office) + '</p>' +
        '<h2 class="sheet-name">' + esc(unit.name) + '</h2>' +
        '<b class="sheet-hpnum">' + view.hp + '/' + view.hpMax + '</b>' +
        '<b class="sheet-sannum">' + view.stagger + '/' + view.staggerMax + '</b>' +
        tabBtn('skills', 'skill', '戦術スキル') +
        tabBtn('passive', 'passive', 'パッシブ') +
        tabBtn('mind', 'sanity', '精神力') +
        '<div class="sheet-page">' + page + '</div>' +
        '<button type="button" class="sheet-close" data-act="sheet-close" aria-label="閉じる">×</button>' +
      '</div>' + resistSlot(unit, view);
  }

  function onSheet(t, act) {
    if (act === 'sheet-close') {
      state.sheet = null;
      renderSheet();
      return;
    }
    if (act === 'sheet') {
      var side = t.getAttribute('data-side');
      var ui = Number(t.getAttribute('data-ui'));
      if (state.sheet && state.sheet.side === side && state.sheet.ui === ui) state.sheet = null;
      else state.sheet = { side: side, ui: ui, tab: 'skills', pick: 0 };
      renderSheet();
      return;
    }
    if (!state.sheet) return;
    if (act === 'sheet-tab') {
      state.sheet.tab = t.getAttribute('data-tab');
      renderSheet();
      return;
    }
    if (act === 'sheet-skill') {
      state.sheet.pick = Number(t.getAttribute('data-pick'));
      state.sheet.tab = 'skills';
      renderSheet();
      return;
    }
    if (act === 'buff') {
      var key = t.getAttribute('data-status');
      state.sheet.buff = state.sheet.buff === key ? null : key;
      renderSheet();
    }
  }

  function onAct(ev) {
    if (ev.target.closest('.term-link')) return;
    var t = ev.target.closest('[data-act]');
    if (t) {
      var sheetAct = t.getAttribute('data-act');
      if (sheetAct === 'sheet' || sheetAct === 'sheet-tab' || sheetAct === 'sheet-skill' || sheetAct === 'sheet-close' || sheetAct === 'buff') {
        onSheet(t, sheetAct);
        return;
      }
    } else if (state.sheet && state.sheet.buff && ev.target.closest('.buffpop')) {
      return;
    } else if (state.sheet && state.sheet.buff && ev.target.closest('.sheet')) {
      state.sheet.buff = null;
      renderSheet();
      return;
    } else if (state.sheet && !ev.target.closest('.sheet')) {
      state.sheet = null;
      renderSheet();
      return;
    }
    if (!t || state.busy) return;
    var act = t.getAttribute('data-act');
    if (act === 'slot') {
      var slotUnit = unitAt('player', t.getAttribute('data-ui'));
      if (!slotUnit || slotUnit.dead || slotUnit.staggered) return;
      state.selected = { ui: Number(t.getAttribute('data-ui')), slot: Number(t.getAttribute('data-slot')) };
      state.note = '';
      render();
      return;
    }
    if (act === 'pick') {
      var pickUnit = unitAt('player', t.getAttribute('data-ui'));
      if (!pickUnit || pickUnit.dead || pickUnit.staggered) return;
      state.selected = { ui: Number(t.getAttribute('data-ui')), slot: Number(t.getAttribute('data-slot')) };
      state.aiming = { ui: state.selected.ui, slot: state.selected.slot, skill: t.getAttribute('data-skill') };
      if (state.assignments[state.aiming.ui]) state.assignments[state.aiming.ui][state.aiming.slot] = null;
      if (state.targets[state.aiming.ui]) state.targets[state.aiming.ui][state.aiming.slot] = null;
      state.note = '';
      render();
      return;
    }
    if (act === 'guard') {
      var ui = Number(t.getAttribute('data-ui'));
      var slot = Number(t.getAttribute('data-slot'));
      var unit = unitAt('player', ui);
      if (!unit || unit.dead || unit.staggered || !unit.defense) return;
      var die = unit.speedDice[slot];
      var original = findSkill(unit, die && die.offers[1]);
      if (!original) return;
      var defense = unit.defense;
      var enabling = !(state.guard[ui] && state.guard[ui][slot]);
      var from = enabling ? original.id : defense.id;
      var to = enabling ? defense.id : original.id;
      state.guard[ui][slot] = enabling;
      if (state.assignments[ui][slot] === from) state.assignments[ui][slot] = to;
      if (state.aiming && state.aiming.ui === ui && state.aiming.slot === slot && state.aiming.skill === from) state.aiming.skill = to;
      state.selected = { ui: ui, slot: slot };
      state.note = '';
      render();
      return;
    }
    if (act === 'target') {
      var chosenUi = state.aiming ? state.aiming.ui : (state.selected ? state.selected.ui : null);
      var chosen = state.aiming ? state.aiming.slot : (state.selected ? state.selected.slot : null);
      var skillId = state.aiming ? state.aiming.skill : (chosenUi != null && state.assignments[chosenUi] ? state.assignments[chosenUi][chosen] : null);
      if (chosenUi == null || !skillId) { state.note = '先にスキルを選んでください'; render(); return; }
      var targetUnit = unitAt('enemy', t.getAttribute('data-ui'));
      if (!targetUnit || targetUnit.dead) return;
      var aimUnit = unitAt('player', chosenUi);
      if (!aimUnit || aimUnit.dead || aimUnit.staggered) return;
      state.assignments[chosenUi][chosen] = skillId;
      state.targets[chosenUi][chosen] = Number(t.getAttribute('data-flat'));
      state.selected = { ui: chosenUi, slot: chosen };
      state.aiming = null;
      state.note = '';
      state.flashSlot = { ui: chosenUi, slot: chosen };
      render();
      return;
    }
    if (act === 'confirm') onConfirm();
    else if (act === 'next') onNext();
    else if (act === 'all') playAll();
    else if (act === 'pause') {
      state.paused = !state.paused;
      if (state.paused) { clearTimeout(state.timer); clearSpin(); }
      renderHand();
      if (!state.paused) {
        if (state.beat === 'approach') {
          impactFlash();
          state.timer = setTimeout(resolveBeat, IMPACT_MS);
        } else if (state.events[state.cursor] && state.events[state.cursor].kind === 'parry') {
          playParry();
        } else {
          schedule();
        }
      }
    }
    else if (act === 'restart') showSetup();
  }

  $('setup').addEventListener('click', function (ev) {
    var button = ev.target.closest('[data-side]');
    if (!button || button.disabled) return;
    var side = button.getAttribute('data-side') === 'me' ? 'meSlot' : 'foeSlot';
    var index = Number(button.getAttribute('data-i'));
    state[side] = state[side] === index ? null : index;
    renderSetup();
  });
  var rules = $('rules');
  $('helpBtn').onclick = function () { rules.showModal(); };
  $('rulesClose').onclick = function () { rules.close(); };
  rules.addEventListener('click', function (ev) { if (ev.target === rules) rules.close(); });
  $('startBtn').onclick = startBattle;
  $('restart').onclick = showSetup;
  $('field').onclick = onAct;
  var termTip = document.createElement('div');
  termTip.id = 'termTip';
  termTip.className = 'buffpop';
  document.body.appendChild(termTip);
  function termLines(kind, key) {
    var info = termInfo(kind, key);
    if (!info) return [];
    if (kind === 'effect') return info.lines || [];
    return statusLines(info);
  }
  function showTermTip(link) {
    var kind = link.getAttribute('data-term-kind');
    var key = link.getAttribute('data-term');
    var info = termInfo(kind, key);
    if (!info) return;
    termTip.innerHTML = '<div class="buffpop-head"><img src="' + termIcon(kind, key) + '" alt="" onerror="this.classList.add(\'fail\')">' +
      '<b>' + esc(info.name) + '</b><span class="buffpop-stack">説明</span></div><ul>' +
      termLines(kind, key).map(function (line) { return '<li>' + esc(line) + '</li>'; }).join('') + '</ul>';
    termTip.classList.add('on');
    var root = document.getElementById('screen') || document.body;
    var box = localRect(link, root);
    var width = termTip.offsetWidth;
    var height = termTip.offsetHeight;
    var left = Math.max(8, Math.min(box.left, root.clientWidth - width - 8));
    var top = box.top - height - 8;
    if (top < 8) top = box.top + box.height + 8;
    termTip.style.left = left + 'px';
    termTip.style.top = top + 'px';
  }
  function hideTermTip() { termTip.classList.remove('on'); }
  document.addEventListener('mouseover', function (ev) {
    var term = ev.target.closest && ev.target.closest('.term');
    var link = term && term.querySelector('.term-link');
    if (link) showTermTip(link);
  });
  document.addEventListener('mouseout', function (ev) {
    var term = ev.target.closest && ev.target.closest('.term');
    if (!term) return;
    if (ev.relatedTarget && term.contains(ev.relatedTarget)) return;
    hideTermTip();
  });
  document.addEventListener('focusin', function (ev) {
    var link = ev.target.closest && ev.target.closest('.term-link');
    if (link) showTermTip(link);
  });
  document.addEventListener('focusout', function (ev) {
    var link = ev.target.closest && ev.target.closest('.term-link');
    if (link) hideTermTip();
  });
  $('stage').addEventListener('mouseover', function (ev) {
    var t = ev.target.closest('.slot[data-side]');
    var next = t ? { side: t.getAttribute('data-side'), ui: Number(t.getAttribute('data-ui')), slot: Number(t.getAttribute('data-slot')) } : null;
    var same = next && state.hover && next.side === state.hover.side && next.ui === state.hover.ui && next.slot === state.hover.slot;
    if (same || (!next && !state.hover)) return;
    state.hover = next;
    drawOverlays();
  });
  $('stage').addEventListener('mouseleave', function () {
    if (!state.hover) return;
    state.hover = null;
    drawOverlays();
  });
  window.addEventListener('resize', function () { if (state.battle) drawOverlays(); });
  window.addEventListener('screenfit', function () { if (state.battle) drawOverlays(); });
  $('logToggle').onclick = function () { $('logdock').classList.toggle('hidden'); };
  $('logClose').onclick = function () { $('logdock').classList.add('hidden'); };
  var opening = readFormation();
  if ((opening.presets[opening.current] || []).length) state.meSlot = opening.current;
  renderSetup();
})();
