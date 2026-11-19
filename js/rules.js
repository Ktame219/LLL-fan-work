var RES_MULT = { fatal: 2, weak: 1.5, normal: 1, endured: 0.5, immune: 0 };
var RES_LABEL = { fatal: '脆弱', weak: '脆弱', normal: '普通', endured: '耐性', immune: '無効' };
var DIE_LABEL = { slash: '斬撃', pierce: '貫通', blunt: '打撃', block: '防御', evade: '回避' };
var DIE_SHORT = { slash: '斬', pierce: '突', blunt: '打', block: '防', evade: '回' };
var LIGHT_REGEN = 1;
var FORCED_ROLLS = [];
var STRICT_ROLLS = false;

function rollInt(min, max) {
  if (min === max) return min;
  if (FORCED_ROLLS.length) {
    var forced = FORCED_ROLLS.shift();
    if (forced < min) return min;
    if (forced > max) return max;
    return forced;
  }
  if (STRICT_ROLLS) throw new Error('unexpected roll ' + min + '-' + max);
  return min + Math.floor(Math.random() * (max - min + 1));
}

function shuffle(list) {
  var a = list.slice();
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  return a;
}

function isOffense(type) {
  return type === 'slash' || type === 'pierce' || type === 'blunt';
}

function skillRecord(id, kind) {
  var src = PAGE[id];
  return {
    id: src.id,
    name: src.name,
    kind: kind,
    attr: src.attr || '',
    text: src.text || '',
    onUse: src.onUse || null,
    motion: src.motion || '',
    icon: src.art || ('assets/skills/' + (src.icon || src.id) + '.png'),
    dice: src.dice
  };
}

function createUnit(def, side, key, ui) {
  return {
    side: side,
    key: key,
    ui: ui,
    name: def.name,
    office: def.office || '',
    mind: def.mind,
    blurb: def.blurb,
    passives: (def.passives || []).map(function (item) {
      return {
        id: item.id || '',
        name: item.name,
        text: item.text || '',
        hooks: item.hooks || []
      };
    }),
    portrait: def.portrait || '',
    motions: def.motions || null,
    head: def.head || '',
    stateshead: def.stateshead || '',
    hp: def.hp,
    hpMax: def.hp,
    stagger: def.stagger,
    staggerMax: def.stagger,
    speedCount: def.speedCount,
    speedMin: def.speedMin,
    speedMax: def.speedMax,
    speedRolls: def.speedRolls || 0,
    speedFaces: def.speedFaces || 0,
    resist: {
      slash: def.resist.slash,
      pierce: def.resist.pierce,
      blunt: def.resist.blunt
    },
    attacks: (def.attacks || []).map(function (id) { return skillRecord(id, PAGE[id].matchable ? 'matchDefense' : 'attack'); }),
    defense: def.defense ? skillRecord(def.defense, PAGE[def.defense] && PAGE[def.defense].matchable ? 'matchDefense' : 'defense') : null,
    speedDice: [],
    staggered: false,
    staggerHold: 0,
    dead: false,
    struck: false,
    usedGuard: false,
    guardPower: 0,
    staggeredEnemy: false,
    staggeredEnemyLast: false,
    scenePower: 0,
    pending: [],
    maxDown: 0,
    status: startStatus(def),
  };
}

function unitsOf(battle, side) {
  return side === 'player' ? battle.allies : battle.foes;
}

function wiped(units) {
  return units.length > 0 && units.every(function (unit) { return unit.dead; });
}

function partyIds(enemyId) {
  var saved = readFormation();
  var team = saved.presets[saved.current] || [];
  var ids = [];
  team.forEach(function (id) {
    if (!ROSTER[id] || ROSTER[id].team === 'off' || id === enemyId) return;
    if (ids.indexOf(id) < 0) ids.push(id);
  });
  return ids;
}

function statusMax(key) {
  var info = STATUS_INFO[key];
  return info && info.max ? info.max : 10;
}

function blankStatus() {
  var status = {};
  Object.keys(STATUS_INFO).forEach(function (key) { status[key] = 0; });
  return status;
}

function startStatus(def) {
  var status = blankStatus();
  if (def.bullets) status.ammo = Math.min(statusMax('ammo'), def.bullets);
  return status;
}

function copyStatus(status) {
  var out = blankStatus();
  Object.keys(out).forEach(function (key) {
    out[key] = status && status[key] ? status[key] : 0;
  });
  return out;
}

function gainStatuses(unit, list) {
  var lines = [];
  (list || []).forEach(function (gain) {
    var info = gain && STATUS_INFO[gain.status];
    if (!info || !gain.amount) return;
    var before = unit.status[gain.status] || 0;
    var cap = statusMax(gain.status);
    var next = Math.min(cap, before + gain.amount);
    unit.status[gain.status] = next;
    var got = next - before;
    if (got <= 0) {
      lines.push(unit.name + 'の' + info.name + 'は最大の' + cap + 'だ。');
      return;
    }
    lines.push(unit.name + 'は' + info.name + got + 'を得た。');
  });
  return lines;
}

function tickStatuses(unit) {
  ['bind', 'disarm', 'feeble', 'fragile', 'damageUp'].forEach(function (key) {
    if (unit.status[key] > 0) unit.status[key] -= 1;
  });
  ['damageDown', 'staggerFragile', 'power', 'protect'].forEach(function (key) {
    if (unit.status[key]) unit.status[key] = 0;
  });
  unit.maxDown = 0;
}

function queueNext(unit, status, amount, lines) {
  if (!unit || unit.dead || !STATUS_INFO[status] || !amount) return;
  unit.pending = unit.pending || [];
  unit.pending.push({ status: status, amount: amount });
  lines.push('次の幕、' + unit.name + 'は' + STATUS_INFO[status].name + amount + 'を受ける。');
}

function matesOf(unit) {
  if (!unit.battle) return [unit];
  return unitsOf(unit.battle, unit.side).filter(function (mate) { return !mate.dead; });
}

function flushPending(unit, logs) {
  var list = unit.pending || [];
  unit.pending = [];
  if (!list.length || unit.dead) return;
  gainStatuses(unit, list).forEach(function (text) {
    logs.push({ cls: 'dim', text: text });
  });
}

function statusPotency(unit, key) {
  if (!unit.status) return 0;
  return Math.min(statusMax(key), unit.status[key] || 0);
}

function skillPower(unit, page, natural, fixed) {
  if (fixed != null) return fixed;
  var guard = isGuardPage(page);
  var cut = guard ? statusPotency(unit, 'disarm') : statusPotency(unit, 'feeble');
  var up = guard ? 0 : statusPotency(unit, 'power');
  return Math.max(0, natural - cut + up);
}

function rollNatural(die) {
  var sum = 0;
  if (die.rolls && die.faces) {
    for (var i = 0; i < die.rolls; i++) sum += rollInt(1, die.faces);
  } else {
    sum = rollInt(die.min, die.max);
  }
  if (die.maxCut) sum = Math.min(sum, Math.max(die.min, die.max - die.maxCut));
  return sum;
}

function rollPower(unit, page, die) {
  if (die.fixed != null) return die.fixed;
  if (unit && unit.maxDown && die.maxCut == null) {
    die.maxCut = unit.maxDown;
    unit.maxDown = 0;
  }
  var natural = rollNatural(die);
  die.natural = natural;
  return skillPower(unit, page, natural + (die.powerBonus || 0), null);
}

var DEBUFF_KEYS = ['disarm', 'bind', 'feeble', 'fragile', 'staggerFragile', 'burn', 'tremor', 'tremorScorch', 'sinking', 'rupture', 'damageDown'];

function debuffKeys(unit) {
  return DEBUFF_KEYS.filter(function (key) { return statusPotency(unit, key) > 0; });
}

function cleanseOne(unit, need, spend, notes) {
  if (statusPotency(unit, 'breath') < need) return;
  var keys = debuffKeys(unit);
  if (!keys.length) return;
  var pick = keys.length === 1 ? keys[0] : keys[rollInt(0, keys.length - 1)];
  var info = STATUS_INFO[pick];
  var had = statusPotency(unit, pick);
  unit.status[pick] = 0;
  var spent = spendStatus(unit, 'breath', spend);
  notes.push(unit.name + 'の' + info.name + had + 'が消え、呼吸を' + spent + '消費した。呼吸' + unit.status.breath + '。');
}

function openSkill(unit, page, target, speed, clash) {
  var dice = copyDice(page);
  var sum = statusPotency(target, 'burn') + statusPotency(target, 'tremor');
  var sinking = statusPotency(target, 'sinking');
  var onUse = page.onUse || {};
  var notes = [];
  var bonus = 0;
  if (onUse.powerPer) {
    var cap = onUse.powerMax == null ? 2 : onUse.powerMax;
    bonus = Math.min(cap, Math.floor(sum / onUse.powerPer));
    if (bonus > 0) notes.push('対象の火傷と振動は' + sum + '。スキル威力+' + bonus + '。');
  }
  if (onUse.breathAtLeast && onUse.power && statusPotency(unit, 'breath') >= onUse.breathAtLeast) {
    bonus += onUse.power;
    notes.push('呼吸は' + statusPotency(unit, 'breath') + '。スキル威力+' + onUse.power + '。');
  }
  if (clash && onUse.sinkingAtLeast && sinking >= onUse.sinkingAtLeast) {
    bonus += onUse.power || 0;
    if (onUse.power) notes.push('対象の沈潜は' + sinking + '。マッチ威力+' + onUse.power + '。');
  }
  if (clash && onUse.sinkingPer) {
    var sinkCap = onUse.powerMax == null ? 3 : onUse.powerMax;
    var per = Math.min(sinkCap, Math.floor(sinking / onUse.sinkingPer));
    bonus += per;
    if (per) notes.push('対象の沈潜は' + sinking + '。スキル威力+' + per + '。');
  }
  if (onUse.unbreakableLast && dice.length && sum >= onUse.unbreakableLast) {
    dice[dice.length - 1].unbreakable = true;
    notes.push('対象の火傷と振動は' + sum + '。最後のダイスは破壊不能になった。');
  }
  if (isGuardPage(page)) unit.usedGuard = true;
  var extra = unit && unit.scenePower ? unit.scenePower : 0;
  if (extra) notes.push('この幕のスキル威力+' + extra + '。');
  var fast = fastestPower(unit, speed);
  if (fast) notes.push('他の誰より速い。スキル威力+' + fast + '。');
  var guarded = !isGuardPage(page) && unit && unit.guardPower ? unit.guardPower : 0;
  if (guarded) notes.push('前の幕に守備スキルを使った。戦術スキル威力+' + guarded + '。');
  (onUse.gain || []).forEach(function (gain) {
    (gain.party ? matesOf(unit) : [unit]).forEach(function (who) {
      if (gain.when === 'next') {
        queueNext(who, gain.status, gain.amount, notes);
        return;
      }
      gainStatuses(who, [gain]).forEach(function (text) { notes.push(text); });
    });
  });
  if (onUse.cleanse) cleanseOne(unit, onUse.cleanse.breath || 0, onUse.cleanse.spend || 0, notes);
  var evade = evadePowerAmount(unit, speed);
  if (evade && dice.some(function (die) { return die.type === 'evade'; })) {
    notes.push('速度' + speed + '。回避ダイス威力+' + evade + '。');
  }
  dice.forEach(function (die) {
    die.powerBonus = bonus + extra + fast + guarded + (die.type === 'evade' ? evade : 0);
  });
  if (!isGuardPage(page)) noteBreath(unit, dice, notes);
  return { dice: dice, notes: notes };
}

function noteBreath(unit, dice, notes) {
  if (!dice.length) return;
  var breath = statusPotency(unit, 'breath');
  if (breath <= 0) return;
  var chance = breath * 5;
  if (chance < 100 && rollInt(1, 100) > chance) return;
  dice.forEach(function (die) { die.breath = 2; });
  var spent = Math.min(breath, dice.length * 3);
  unit.status.breath = breath - spent;
  notes.push('クリティカル。全ダイスのダメージ+2。呼吸が' + spent + '減少。');
}

function moraleLine(unit, list, logs) {
  gainStatuses(unit, list).forEach(function (text) {
    logs.push({ cls: 'bad', text: text });
  });
}

function findSkill(unit, id) {
  if (!id) return null;
  if (unit.defense && unit.defense.id === id) return unit.defense;
  for (var i = 0; i < unit.attacks.length; i++) {
    if (unit.attacks[i].id === id) return unit.attacks[i];
  }
  return null;
}

function rollSpeedValue(unit) {
  var raw = 0;
  if (unit.speedRolls) {
    for (var i = 0; i < unit.speedRolls; i++) raw += rollInt(1, unit.speedFaces);
  } else {
    raw = rollInt(unit.speedMin, unit.speedMax);
  }
  return Math.max(0, raw - statusPotency(unit, 'bind'));
}

function offerPair(unit) {
  var ids = unit.attacks.map(function (skill) { return skill.id; });
  if (ids.length < 2) return ids.slice();
  var first = ids.splice(Math.floor(Math.random() * ids.length), 1)[0];
  var second = ids.splice(Math.floor(Math.random() * ids.length), 1)[0];
  return [first, second];
}

function assignDiceCounts(units, total) {
  var extra = total - units.length;
  var bonus = units.map(function () { return 0; });
  var i = 0;
  while (extra > 0) {
    bonus[i % units.length] += 1;
    i += 1;
    extra -= 1;
  }
  units.forEach(function (unit, n) { unit.speedCount = 1 + bonus[n]; });
}

function createBattle(allyIds, foeIds) {
  var allies = allyIds.map(function (id, i) {
    return createUnit(ROSTER[id], 'player', id, i);
  });
  var foes = foeIds.map(function (id, i) {
    return createUnit(ROSTER[id], 'enemy', id, i);
  });
  var total = Math.max(allies.length, foes.length);
  assignDiceCounts(allies, total);
  assignDiceCounts(foes, total);
  var battle = {
    scene: 0,
    over: false,
    overEmitted: false,
    winner: null,
    allies: allies,
    foes: foes
  };
  allies.concat(foes).forEach(function (unit) { unit.battle = battle; });
  return battle;
}

function beginScene(battle) {
  var logs = [];
  if (battle.over) return logs;
  battle.scene += 1;
  logs.push({ cls: 'clash', text: '第' + battle.scene + '幕。' });
  battle.allies.concat(battle.foes).forEach(function (unit) {
    if (unit.dead) {
      unit.speedDice = [];
      return;
    }
    unit.staggeredEnemyLast = !!unit.staggeredEnemy;
    unit.staggeredEnemy = false;
    unit.scenePower = unit.struck ? nextPowerAmount(unit) : 0;
    unit.struck = false;
    unit.guardPower = unit.usedGuard ? guardedPowerAmount(unit) : 0;
    unit.usedGuard = false;
    if (unit.scenePower) {
      logs.push({ cls: 'win', text: unit.name + 'は攻撃を受けた反動で、この幕のスキル威力+' + unit.scenePower + '。' });
    }
    if (unit.guardPower) {
      logs.push({ cls: 'win', text: unit.name + 'は前の幕に守備スキルを使い、この幕の戦術スキル威力+' + unit.guardPower + '。' });
    }
    if (battle.scene === 1) {
      var stageLines = [];
      runPassives(unit, 'stage', { lines: stageLines, battle: battle });
      stageLines.forEach(function (text) { logs.push({ cls: 'dim', text: text }); });
    }
    tickStatuses(unit);
    flushPending(unit, logs);
    var locked = false;
    if (unit.staggered) {
      if (unit.staggerHold > 1) {
        unit.staggerHold -= 1;
        locked = true;
      } else {
        unit.staggered = false;
        unit.staggerHold = 0;
        unit.stagger = unit.staggerMax;
        logs.push({ cls: 'win', text: unit.name + 'の混乱が解け、混乱抵抗が戻った。' });
        moraleLine(unit, unit.mind.onRecover, logs);
      }
    } else if (unit.stagger > 0 && unit.stagger <= Math.floor(unit.staggerMax * 0.25)) {
      if (unit.mind.lowEffects && unit.mind.lowEffects.length) {
        logs.push({ cls: 'bad', text: unit.name + 'は士気が下がっている。' });
        moraleLine(unit, unit.mind.lowEffects, logs);
      }
    }
    unit.speedDice = [];
    for (var i = 0; i < unit.speedCount; i++) {
      var speed = rollSpeedValue(unit);
      unit.speedDice.push({
        slot: i,
        speed: speed,
        offers: offerPair(unit),
        page: null,
        target: null
      });
    }
    var speeds = unit.speedDice.map(function (d) { return d.speed; }).join('、');
    var bindNote = unit.status.bind ? '束縛' + unit.status.bind + 'で速度が下がっている。' : '';
    logs.push(locked
      ? { cls: 'bad', text: unit.name + 'は混乱したままだ。速度は ' + speeds + '。ダイスは残るが、この幕は行動できない。' }
      : { cls: 'dim', text: unit.name + 'の速度は ' + speeds + '。' + bindNote });
  });
  battle.foePlan = null;
  if (!battle.over && battle.foes.some(function (unit) { return !unit.dead; })) planEnemy(battle);
  return logs;
}

function randomTargets(ids, foe) {
  return ids.map(function (id) {
    if (!id || !foe.speedDice.length) return null;
    return Math.floor(Math.random() * foe.speedDice.length);
  });
}

function flatCount(units) {
  var n = 0;
  units.forEach(function (unit) {
    if (!unit.dead) n += unit.speedDice.length;
  });
  return n;
}

function planEnemy(battle) {
  var openings = flatCount(battle.allies);
  battle.foePlan = battle.foes.map(function (foe) {
    var skills = [];
    var targets = [];
    if (foe.dead) return { skills: skills, targets: targets };
    foe.speedDice.forEach(function (die) {
      if (foe.staggered) {
        skills.push(null);
        targets.push(null);
        return;
      }
      var offer = die.offers.length ? die.offers[Math.floor(Math.random() * die.offers.length)] : null;
      var defend = foe.defense && Math.random() < 0.22;
      skills.push(defend ? foe.defense.id : offer);
      targets.push(openings ? Math.floor(Math.random() * openings) : null);
    });
    return { skills: skills, targets: targets };
  });
  return battle.foePlan;
}

function dieKey(d) {
  return d.ui + ':' + d.slot;
}

function pairDice(pList, eList) {
  var usedP = {};
  var usedE = {};
  var list = [];
  function pairKind(p, e) {
    var matchA = p.pageKind === 'matchDefense';
    var matchB = e.pageKind === 'matchDefense';
    var guardA = p.pageKind === 'defense';
    var guardB = e.pageKind === 'defense';
    if ((matchA && matchB) || (matchA && guardB) || (matchB && guardA)) return 'split';
    if (guardA && guardB) return 'cancel';
    return 'clash';
  }
  function clash(p, e) {
    var kind = pairKind(p, e);
    if (kind === 'split') return;
    usedP[dieKey(p)] = true;
    usedE[dieKey(e)] = true;
    list.push({
      kind: kind, speed: Math.max(p.speed, e.speed), priority: 0, order: 0,
      player: p.slot, enemy: e.slot, playerUi: p.ui, enemyUi: e.ui
    });
  }
  function sameAim(a, b) {
    return a && b && a.ui === b.ui && a.slot === b.slot;
  }
  var all = pList.map(function (d) { return { side: 'player', die: d }; })
    .concat(eList.map(function (d) { return { side: 'enemy', die: d }; }))
    .sort(function (a, b) {
      if (b.die.speed !== a.die.speed) return b.die.speed - a.die.speed;
      if (a.side !== b.side) return a.side === 'player' ? -1 : 1;
      if (a.die.ui !== b.die.ui) return a.die.ui - b.die.ui;
      return a.die.slot - b.die.slot;
    });
  all.forEach(function (row) {
    var d = row.die;
    if (!d.armed || d.target == null) return;
    if (row.side === 'player') {
      if (usedP[dieKey(d)]) return;
      var e = eList[d.target];
      if (!e || !e.armed || usedE[dieKey(e)]) return;
      if (sameAim(pList[e.target], d) || d.speed > e.speed) clash(d, e);
    } else {
      if (usedE[dieKey(d)]) return;
      var p = pList[d.target];
      if (!p || !p.armed || usedP[dieKey(p)]) return;
      if (sameAim(eList[p.target], d)) clash(p, d);
    }
  });
  pList.forEach(function (p) {
    if (p.armed && !usedP[dieKey(p)]) {
      list.push({
        kind: 'onesided', speed: p.speed, priority: 1, order: 0,
        side: 'player', ui: p.ui, slot: p.slot, target: p.target
      });
    }
  });
  eList.forEach(function (e) {
    if (e.armed && !usedE[dieKey(e)]) {
      list.push({
        kind: 'onesided', speed: e.speed, priority: 1, order: 1,
        side: 'enemy', ui: e.ui, slot: e.slot, target: e.target
      });
    }
  });
  list.sort(function (a, b) {
    if (b.speed !== a.speed) return b.speed - a.speed;
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.order - b.order;
  });
  return list;
}

function flatDice(units, plans) {
  var list = [];
  units.forEach(function (unit, ui) {
    var plan = plans ? plans[ui] : null;
    unit.speedDice.forEach(function (die, slot) {
      if (unit.dead) return;
      var skillId = plan ? plan.skills[slot] : (die.page ? die.page.id : null);
      var page = plan ? findSkill(unit, skillId) : die.page;
      var armed = plan ? !!skillId : !!die.page;
      var target = plan ? plan.targets[slot] : die.target;
      list.push({
        ui: unit.ui,
        slot: slot,
        speed: die.speed,
        armed: armed,
        target: target == null ? null : target,
        pageKind: page ? page.kind : ''
      });
    });
  });
  return list;
}

function previewEngagements(battle, assignments, targets) {
  var allyPlans = battle.allies.map(function (unit, ui) {
    var ids = assignments && assignments[ui] ? assignments[ui] : unit.speedDice.map(function () { return null; });
    var aims = targets && targets[ui] ? targets[ui] : unit.speedDice.map(function () { return null; });
    return { skills: ids, targets: aims };
  });
  var foePlans = battle.foePlan || battle.foes.map(function (unit) {
    return { skills: unit.speedDice.map(function () { return null; }), targets: unit.speedDice.map(function () { return null; }) };
  });
  return pairDice(flatDice(battle.allies, allyPlans), flatDice(battle.foes, foePlans));
}

function validatePlan(unit, ids) {
  if (!ids || ids.length !== unit.speedDice.length) return '速度ダイスの数が合わない';
  for (var i = 0; i < ids.length; i++) {
    if (!ids[i]) continue;
    if (unit.defense && ids[i] === unit.defense.id) continue;
    if (unit.speedDice[i].offers.indexOf(ids[i]) < 0) return 'そのスキルは選べません';
  }
  return null;
}

function applyPlan(unit, ids, targets) {
  if (unit.staggered) {
    unit.speedDice.forEach(function (die) {
      die.page = null;
      die.target = null;
    });
    return;
  }
  for (var i = 0; i < ids.length; i++) {
    var skill = findSkill(unit, ids[i]);
    if (!skill) {
      unit.speedDice[i].page = null;
      unit.speedDice[i].target = null;
      continue;
    }
    unit.speedDice[i].page = skill;
    unit.speedDice[i].target = targets[i] == null ? 0 : targets[i];
  }
}

function scorePage(page, foe) {
  var score = 0.4 + (page.cost || 0) * 0.05;
  page.dice.forEach(function (die) {
    var avg = (die.min + die.max) / 2;
    if (isOffense(die.type)) score += avg * RES_MULT[foe.resist[die.type]];
    else score += avg * 0.45;
  });
  return score;
}

function chooseAssignments(unit) {
  return unit.speedDice.map(function (die) {
    if (Math.random() < 0.22) return unit.defense.id;
    return die.offers[Math.floor(Math.random() * die.offers.length)];
  });
}

function snap(battle) {
  return {
    allies: battle.allies.map(snapUnit),
    foes: battle.foes.map(snapUnit)
  };
}

function snapUnit(unit) {
  return {
    hp: unit.hp,
    hpMax: unit.hpMax,
    stagger: unit.stagger,
    staggerMax: unit.staggerMax,
    light: unit.light,
    lightMax: unit.lightMax,
    staggered: unit.staggered,
    dead: unit.dead,
    status: copyStatus(unit.status),
    resist: resistNow(unit)
  };
}

function emit(events, battle, partial) {
  partial.units = snap(battle);
  if (!partial.focus) partial.focus = { player: -1, enemy: -1 };
  if (!partial.cls) partial.cls = 'dim';
  events.push(partial);
}

function copyDice(page) {
  return page.dice.map(function (die) {
    return {
      type: die.type,
      min: die.min,
      max: die.max,
      roll: die.roll || '',
      rolls: die.rolls || 0,
      faces: die.faces || 0,
      text: die.text || '',
      fixed: null,
      shown: null,
      bullet: die.bullet || 0,
      tremorBurst: !!die.tremorBurst,
      ruptureBurst: !!die.ruptureBurst,
      unbreakable: !!die.unbreakable,
      powerBonus: 0,
      critBonus: die.critBonus || 0,
      clashed: false,
      onHit: die.onHit || null,
      onEvade: die.onEvade || null,
      onWin: die.onWin || null
    };
  });
}

function bulletCost(die) {
  if (!die || die.bullet == null || die.bullet === false) return 0;
  if (die.bullet === true) return 1;
  var cost = die.bullet | 0;
  return cost > 0 ? cost : 0;
}

function higherHpDamage(unit, target) {
  if (!unit || !target || !(target.hp > unit.hp)) return 0;
  var total = 0;
  (unit.passives || []).forEach(function (passive) {
    (passive.hooks || []).forEach(function (hook) {
      if (hook && hook.op === 'higherHp') total += hook.amount || 0;
    });
  });
  return total;
}

function evadePowerAmount(unit, speed) {
  if (!unit || speed == null) return 0;
  var total = 0;
  (unit.passives || []).forEach(function (passive) {
    (passive.hooks || []).forEach(function (hook) {
      if (hook && hook.op === 'evadePower' && speed >= hook.speed) total += hook.amount || 0;
    });
  });
  return total;
}

function typeDamageAmount(unit, type) {
  var total = 0;
  (unit.passives || []).forEach(function (passive) {
    (passive.hooks || []).forEach(function (hook) {
      if (hook && hook.op === 'typeDamage' && hook.type === type) total += hook.amount || 0;
    });
  });
  return total;
}

function boostLines(unit, boost, lines) {
  if (boost.empty) {
    lines.push(unit.name + 'は弾丸がなく、攻撃はキャンセルされた。');
    return;
  }
  if (boost.spent) lines.push(unit.name + 'は弾丸' + boost.spent + 'を消費した。残り' + statusPotency(unit, 'ammo') + '。');
  if (boost.bonus) lines.push('灼熱推進弾でダメージ+' + boost.bonus + '。');
  if (boost.typed) lines.push(DIE_LABEL[boost.type] + 'ダメージ+' + boost.typed + '。');
  if (boost.up) lines.push(STATUS_INFO.damageUp.name + 'でダメージ+' + boost.up + '。');
  if (boost.down) lines.push(STATUS_INFO.damageDown.name + 'でダメージ-' + boost.down + '。');
  if (boost.breath) lines.push('呼吸でダメージ+' + boost.breath + '。');
  if (boost.critBonus) lines.push('クリティカルダメージ+' + boost.critBonus + '。');
  if (boost.higher) lines.push('対象の体力が上回っている。ダメージ+' + boost.higher + '。');
}

function guardedPowerAmount(unit) {
  var total = 0;
  (unit.passives || []).forEach(function (passive) {
    (passive.hooks || []).forEach(function (hook) {
      if (hook && hook.op === 'guardedPower') total += hook.amount || 0;
    });
  });
  return total;
}

function boostedRaw(unit, die, speed, raw, target) {
  if (raw <= 0 || !isOffense(die.type)) return { raw: raw, bonus: 0, spent: 0, typed: 0, type: die.type, up: 0, down: 0, breath: 0, critBonus: 0, higher: 0 };
  var cost = bulletCost(die);
  var spent = 0;
  var bonus = 0;
  var next = raw;
  if (cost && statusPotency(unit, 'ammo') < cost) {
    return { raw: 0, empty: true, bonus: 0, spent: 0, typed: 0, type: die.type, up: 0, down: 0, breath: 0, critBonus: 0, higher: 0 };
  }
  if (cost) {
    unit.status.ammo -= cost;
    spent = cost;
    if (statusPotency(unit, 'scorchAmmo') > 0) bonus = speed >= 6 ? 5 : 2;
    next += bonus;
  }
  var typed = typeDamageAmount(unit, die.type);
  if (typed) next += typed;
  var up = statusPotency(unit, 'damageUp');
  if (up) next += up;
  var breath = die.breath || 0;
  if (breath) next += breath;
  var critBonus = breath && die.critBonus ? die.critBonus : 0;
  if (critBonus) next += critBonus;
  var higher = higherHpDamage(unit, target);
  if (higher) next += higher;
  var down = statusPotency(unit, 'damageDown');
  var cut = down ? Math.min(down, next) : 0;
  next -= cut;
  return { raw: next, bonus: bonus, spent: spent, typed: typed, type: die.type, up: up, down: cut, breath: breath, critBonus: critBonus, higher: higher };
}

function healHp(unit, amount) {
  if (!unit || unit.dead || amount <= 0) return 0;
  var before = unit.hp;
  unit.hp = Math.min(unit.hpMax, unit.hp + amount);
  return unit.hp - before;
}

function healStagger(unit, amount) {
  if (!unit || unit.dead || unit.staggerMax <= 0 || amount <= 0) return 0;
  var before = unit.stagger;
  unit.stagger = Math.min(unit.staggerMax, unit.stagger + amount);
  return unit.stagger - before;
}

function fastestPower(unit, speed) {
  if (!unit || speed == null || !unit.battle) return 0;
  var others = unit.battle.allies.concat(unit.battle.foes);
  for (var i = 0; i < others.length; i++) {
    var other = others[i];
    if (other === unit || other.dead) continue;
    var dice = other.speedDice || [];
    for (var d = 0; d < dice.length; d++) {
      if (dice[d].speed >= speed) return 0;
    }
  }
  var total = 0;
  (unit.passives || []).forEach(function (passive) {
    (passive.hooks || []).forEach(function (hook) {
      if (hook && hook.op === 'fastestPower') total += hook.amount || 0;
    });
  });
  return total;
}

function applyFlatHp(unit, amount) {
  if (amount <= 0 || unit.dead) return { amount: 0, died: !!unit.dead };
  unit.hp = Math.max(0, unit.hp - amount);
  if (unit.hp <= 0) unit.dead = true;
  return { amount: amount, died: unit.dead };
}

function tremorBurst(unit) {
  var tremor = statusPotency(unit, 'tremor');
  var scorch = statusPotency(unit, 'tremorScorch');
  var burn = statusPotency(unit, 'burn');
  var san = tremor;
  var hp = 0;
  if (scorch > 0) {
    san += scorch;
    hp = Math.floor((scorch + burn) / 2);
  }
  if (san > 0) unit.stagger = Math.max(0, unit.stagger - san);
  var died = false;
  if (hp > 0) {
    unit.hp = Math.max(0, unit.hp - hp);
    if (unit.hp <= 0) unit.dead = true;
    died = unit.dead;
  }
  return {
    san: san,
    hp: hp,
    broke: !died && !unit.staggered && unit.stagger <= 0,
    died: died
  };
}

function noteBurst(unit, lines, hits, broken, dead, by) {
  if (!unit || unit.dead) return;
  var burst = tremorBurst(unit);
  if (!burst.san && !burst.hp) {
    lines.push(unit.name + 'は振動爆発を受けた。振動はない。');
    return;
  }
  var text = unit.name + 'は振動爆発を受けた。';
  if (burst.san) {
    text += '混乱抵抗' + burst.san + '。';
    hits.push({ side: unit.side, ui: unit.ui, amount: burst.san, label: '振動' });
  }
  if (burst.hp) {
    text += '憤怒で体力' + burst.hp + '。';
    hits.push({ side: unit.side, ui: unit.ui, amount: burst.hp, label: '憤怒' });
  }
  text += '体力' + unit.hp + '、混乱抵抗' + unit.stagger + '。';
  lines.push(text);
  if (burst.broke) queueBreak(broken, unit, by);
  if (burst.died) dead.push(unit);
}

function ruptureBurst(unit) {
  var stacks = statusPotency(unit, 'rupture');
  if (stacks <= 0) return { hp: 0, died: false };
  var flat = applyFlatHp(unit, stacks);
  return { hp: flat.amount, died: flat.died };
}

function noteRuptureBurst(unit, lines, hits, dead) {
  if (!unit || unit.dead) return;
  var burst = ruptureBurst(unit);
  if (!burst.hp) {
    lines.push(unit.name + 'は破裂爆発を受けた。破裂はない。');
    return;
  }
  lines.push(unit.name + 'は破裂爆発を受けた。体力' + burst.hp + '。体力' + unit.hp + '。');
  hits.push({ side: unit.side, ui: unit.ui, amount: burst.hp, label: '破裂' });
  if (burst.died) dead.push(unit);
}

function spendStatus(unit, key, amount) {
  var have = statusPotency(unit, key);
  var spent = Math.min(have, amount || 0);
  unit.status[key] = have - spent;
  return spent;
}

function amplitudeConvert(unit, from, to) {
  var amount = statusPotency(unit, from);
  if (!amount || !STATUS_INFO[to]) return 0;
  var kept = statusPotency(unit, to);
  unit.status[from] = 0;
  unit.status[to] = Math.min(statusMax(to), kept + amount);
  return amount;
}

function skillNumber(unit, page) {
  if (!unit || !page) return -1;
  for (var i = 0; i < unit.attacks.length; i++) {
    if (unit.attacks[i].id === page.id) return i + 1;
  }
  if (unit.defense && unit.defense.id === page.id) return 0;
  return -1;
}

function nextPowerAmount(unit) {
  var total = 0;
  (unit.passives || []).forEach(function (passive) {
    (passive.hooks || []).forEach(function (hook) {
      if (hook.on === 'attacked' && hook.op === 'nextPower') total += hook.amount || 0;
    });
  });
  return total;
}

function magazineConvert(unit) {
  var info = STATUS_INFO.scorchAmmo;
  var bullets = statusPotency(unit, 'ammo');
  if (!bullets) return [unit.name + 'に変換する弾丸はなかった。'];
  var before = statusPotency(unit, 'scorchAmmo');
  var next = Math.min(statusMax('scorchAmmo'), before + bullets);
  unit.status.scorchAmmo = next;
  var got = next - before;
  if (!got) return [unit.name + 'の' + info.name + 'は最大の' + statusMax('scorchAmmo') + 'だ。'];
  return [unit.name + 'の弾丸' + bullets + 'が' + info.name + got + 'になった。弾丸は' + bullets + 'のまま。'];
}

function runPassives(unit, on, ctx) {
  if (!unit) return;
  var lines = ctx.lines || [];
  (unit.passives || []).forEach(function (passive) {
    (passive.hooks || []).forEach(function (hook) {
      if (!hook || hook.on !== on) return;
      if (hook.skill != null && skillNumber(unit, ctx.page) !== hook.skill) return;
      if (hook.if === 'staggeredLast' && !unit.staggeredEnemyLast) return;
      if (hook.op === 'magazine') {
        magazineConvert(unit).forEach(function (text) { lines.push(text); });
        return;
      }
      if (hook.op === 'gain') {
        var who = on === 'hit' && !hook.self ? ctx.target : unit;
        if (!who || who.dead) return;
        if (hook.when === 'next') {
          queueNext(who, hook.status, hook.amount, lines);
          return;
        }
        gainStatuses(who, [{ status: hook.status, amount: hook.amount }]).forEach(function (text) {
          lines.push(text);
        });
        return;
      }
      if (hook.op === 'nextPower') unit.struck = true;
      if (hook.op === 'partySan') {
        var mates = ctx.battle ? (unit.side === 'player' ? ctx.battle.allies : ctx.battle.foes) : [];
        mates.forEach(function (mate) {
          if (!mate || mate.dead) return;
          var roll = rollInt(hook.min, hook.max);
          var got = healStagger(mate, roll);
          if (got > 0) lines.push(mate.name + 'の混乱抵抗が' + got + '戻った。混乱抵抗' + mate.stagger + '。');
          else lines.push(mate.name + 'の混乱抵抗は最大の' + mate.staggerMax + 'だ。');
        });
        if (unit.stagger >= hook.san) {
          gainStatuses(unit, [{ status: 'breath', amount: hook.breath }]).forEach(function (text) {
            lines.push(text);
          });
        }
        return;
      }
      if (hook.op === 'heal') {
        var healed = healHp(unit, hook.amount || 0);
        if (healed > 0) lines.push(unit.name + 'はマッチに勝ち、体力が' + healed + '戻った。体力' + unit.hp + '。');
      }
      if (hook.op === 'breathSan') {
        var have = statusPotency(unit, 'breath');
        if (have < hook.breath) return;
        var got = healStagger(unit, hook.amount || 0);
        lines.push(got > 0
          ? unit.name + 'は呼吸' + have + '。混乱抵抗が' + got + '戻った。混乱抵抗' + unit.stagger + '。'
          : unit.name + 'は呼吸' + have + 'だが、混乱抵抗は最大の' + unit.staggerMax + 'だ。');
      }
    });
  });
}

function dieWin(unit, die, next, lines) {
  if (!unit || unit.dead || !die) return;
  (die.onWin || []).forEach(function (op) {
    if (!op || op.op !== 'nextDiePower') return;
    if (!next) {
      lines.push(unit.name + 'に威力を上げる次のダイスはない。');
      return;
    }
    next.powerBonus = (next.powerBonus || 0) + (op.amount || 0);
    lines.push(unit.name + 'の次のダイス威力+' + (op.amount || 0) + '。');
  });
}

function noteClashWin(unit, lines) {
  if (!unit || unit.dead) return;
  runPassives(unit, 'clashWin', { lines: lines });
}

function afterHit(atk, def, die, page, lines) {
  if (!atk || !die) return;
  if (def && !def.dead) runPassives(atk, 'hit', { page: page, die: die, target: def, lines: lines });
  if (die.natural != null && die.natural === die.max) {
    runPassives(atk, 'maxHit', { page: page, die: die, target: def, lines: lines });
  }
}

function markAttacked(unit, die) {
  if (!unit || unit.dead || !die || !isOffense(die.type)) return;
  runPassives(unit, 'attacked', { lines: [] });
}

function queueBreak(list, unit, by) {
  if (!unit) return;
  unit.brokenBy = by || null;
  list.push(unit);
}

function noteEvade(unit, die, lines) {
  if (!unit || unit.dead || !die) return;
  (die.onEvade || []).forEach(function (op) {
    if (!op || op.op !== 'healSan') return;
    var got = healStagger(unit, op.amount || 0);
    lines.push(got > 0
      ? unit.name + 'は回避に成功し、混乱抵抗が' + got + '戻った。混乱抵抗' + unit.stagger + '。'
      : unit.name + 'は回避に成功した。混乱抵抗は最大の' + unit.staggerMax + 'だ。');
  });
}

function applyOnHit(atk, def, die, lines, hits, broken, dead, dealt) {
  if (!die) return;
  var list = (die.onHit || []).slice();
  if (die.tremorBurst && !list.some(function (op) { return op && op.op === 'burst'; })) {
    list.unshift({ op: 'burst' });
  }
  if (die.ruptureBurst && !list.some(function (op) { return op && op.op === 'ruptureBurst'; })) {
    list.unshift({ op: 'ruptureBurst' });
  }
  list.forEach(function (op) {
    if (!op) return;
    if (op.op === 'healSanDealt') {
      if (!atk || atk.dead || (op.if === 'crit' && !die.breath)) return;
      var got = healStagger(atk, dealt || 0);
      lines.push(got > 0
        ? atk.name + 'はクリティカルのダメージ' + got + 'だけ混乱抵抗が戻った。混乱抵抗' + atk.stagger + '。'
        : atk.name + 'の混乱抵抗は最大の' + atk.staggerMax + 'だ。');
      return;
    }
    if (op.op === 'gain') {
      if (op.if === 'crit' && !die.breath) return;
      var who = op.self ? atk : def;
      if (!who || who.dead) return;
      if (op.when === 'next') {
        queueNext(who, op.status, op.amount, lines);
        return;
      }
      gainStatuses(who, [{ status: op.status, amount: op.amount }]).forEach(function (text) {
        lines.push(text);
      });
      return;
    }
    if (!def || def.dead) return;
    if (op.op === 'maxDown') {
      def.maxDown = (def.maxDown || 0) + (op.amount || 0);
      lines.push(def.name + 'の次のダイスの最大値-' + def.maxDown + '。');
      return;
    }
    if (op.op === 'burst') {
      noteBurst(def, lines, hits, broken, dead, atk);
      return;
    }
    if (op.op === 'ruptureBurst') {
      noteRuptureBurst(def, lines, hits, dead);
      return;
    }
    var info = STATUS_INFO[op.status || op.from];
    if (op.op === 'spend') {
      var spent = spendStatus(def, op.status, op.amount);
      lines.push(spent
        ? def.name + 'の' + info.name + 'を' + spent + '消費した。'
        : def.name + 'に消費する' + info.name + 'はなかった。');
      return;
    }
    if (op.op === 'convert') {
      var moved = amplitudeConvert(def, op.from, op.to);
      var fromInfo = STATUS_INFO[op.from];
      var toInfo = STATUS_INFO[op.to];
      lines.push(moved
        ? def.name + 'の' + fromInfo.name + moved + 'が' + toInfo.name + 'になった。'
        : def.name + 'に変換する' + fromInfo.name + 'はなかった。');
    }
  });
}

function protectUnbreakable(a, b, out) {
  if (out.winner !== 'a' && a.unbreakable) out.aConsumed = false;
  if (out.winner !== 'b' && b.unbreakable) out.bConsumed = false;
  if (!out.aConsumed && !out.bConsumed) {
    if (a.unbreakable && !b.unbreakable) out.bConsumed = true;
    else if (b.unbreakable && !a.unbreakable) out.aConsumed = true;
    else {
      out.aConsumed = true;
      out.bConsumed = true;
    }
  }
  if ((a.unbreakable && !out.aConsumed) || (b.unbreakable && !out.bConsumed)) {
    if (out.winner === 'tie') out.note = '出目が同じ。破壊不能のダイスは消えない。';
    else if (out.note.indexOf('破壊不能') < 0) out.note += '破壊不能のダイスは消えない。';
  }
  return out;
}

function endScene(battle, events) {
  battle.allies.concat(battle.foes).forEach(function (unit) {
    if (unit.dead) return;
    var lines = [];
    var hits = [];
    var burn = statusPotency(unit, 'burn');
    var died = false;
    if (burn > 0) {
      applyFlatHp(unit, burn);
      var next = Math.floor(burn / 2);
      unit.status.burn = next;
      lines.push(unit.name + 'は火傷' + burn + 'を受けた。体力' + unit.hp + '。火傷は' + next + 'になった。');
      hits.push({ side: unit.side, ui: unit.ui, amount: burn, label: '火傷' });
      died = unit.dead;
    }
    var sinking = statusPotency(unit, 'sinking');
    var broke = false;
    if (sinking > 0 && !died) {
      var sunk = Math.floor(sinking / 2);
      unit.status.sinking = sunk;
      if (unit.staggerMax <= 0 || unit.stagger <= 0) {
        var sinkHp = Math.floor(sinking / 2);
        var flat = applyFlatHp(unit, sinkHp);
        lines.push(unit.name + 'は沈潜' + sinking + '。SANがないため、半分の体力' + flat.amount + '。体力' + unit.hp + '。沈潜は' + sunk + 'になった。');
        if (flat.amount > 0) hits.push({ side: unit.side, ui: unit.ui, amount: flat.amount, label: '沈潜' });
        died = unit.dead;
      } else {
        unit.stagger = Math.max(0, unit.stagger - sinking);
        lines.push(unit.name + 'は沈潜' + sinking + 'のSANダメージ。混乱抵抗' + unit.stagger + '。沈潜は' + sunk + 'になった。');
        hits.push({ side: unit.side, ui: unit.ui, amount: sinking, label: 'SAN' });
        if (!unit.staggered && unit.stagger <= 0) broke = true;
      }
    }
    if (!died) runPassives(unit, 'sceneEnd', { lines: lines });
    if (broke && unit.stagger > 0) broke = false;
    var tremor = statusPotency(unit, 'tremor');
    if (tremor > 0) {
      unit.status.tremor = tremor - 1;
      lines.push(unit.name + 'の振動が1減り、' + unit.status.tremor + 'になった。');
    }
    var rupture = statusPotency(unit, 'rupture');
    if (rupture > 0) {
      unit.status.rupture = rupture - 1;
      lines.push(unit.name + 'の破裂が1減り、' + unit.status.rupture + 'になった。');
    }
    var scorch = statusPotency(unit, 'tremorScorch');
    if (scorch > 0) {
      unit.status.tremorScorch = scorch - 1;
      lines.push(unit.name + 'の振動-灼熱が1減り、' + unit.status.tremorScorch + 'になった。');
    }
    var breath = statusPotency(unit, 'breath');
    if (breath > 0) {
      unit.status.breath = breath - 1;
      lines.push(unit.name + 'の呼吸が1減り、' + unit.status.breath + 'になった。');
    }
    if (!lines.length) return;
    emit(events, battle, {
      kind: 'dot',
      cls: hits.length ? 'hit' : 'dim',
      target: unit.side,
      ui: unit.ui,
      hits: hits,
      text: lines.join('')
    });
    if (broke) finishBreak(unit, events, battle);
    if (died) finishDeath(unit, events, battle);
  });
}

function columnDice(dice, index, consumed) {
  return dice.map(function (die, i) {
    var waiting = die.roll
      ? DIE_SHORT[die.type] + ' ' + die.roll
      : DIE_SHORT[die.type] + ' ' + die.min + '–' + die.max;
    if (die.unbreakable) waiting += ' 不能';
    var label = die.shown || waiting;
    var state = 'wait';
    if (i < index || (i === index && consumed)) state = 'done';
    else if (i === index) state = 'now';
    return { state: state, label: label };
  });
}

function sideColumn(unit, speedDie, dice, index, consumed) {
  return {
    name: unit.name,
    speed: speedDie.speed,
    page: speedDie.page.name,
    dice: columnDice(dice, index, consumed)
  };
}

function emptyColumn(unit) {
  return { name: unit.name, speed: null, page: null, dice: [] };
}

function isDefense(type) {
  return type === 'block' || type === 'evade';
}

function isGuardPage(page) {
  return !!(page && (page.kind === 'defense' || page.kind === 'matchDefense'));
}

function isMatchGuard(page) {
  return !!(page && page.kind === 'matchDefense');
}

function isNormalGuard(page) {
  return !!(page && page.kind === 'defense');
}

function setDieD1(die) {
  if (die.rolls) {
    die.faces = 1;
    die.min = die.rolls;
    die.max = die.rolls;
    die.roll = die.rolls + 'd1';
  } else {
    die.rolls = 0;
    die.faces = 0;
    die.min = 1;
    die.max = 1;
    die.roll = '';
  }
  die.fixed = null;
}

function degradeMatchGuard(dice) {
  dice.forEach(setDieD1);
}

function dealSanPower(battle, src, target, power, events, speedDie, type) {
  if (battle.over || src.dead || target.dead) return;
  var lines = [];
  var hits = [];
  var broken = [];
  var dead = [];
  var focus = src.side === 'player'
    ? { player: speedDie.slot, playerUi: src.ui, enemy: -1, enemyUi: -1 }
    : { player: -1, playerUi: -1, enemy: speedDie.slot, enemyUi: src.ui };
  if (target.staggerMax <= 0 || target.stagger <= 0) {
    var hp = Math.floor(power / 2);
    var flat = applyFlatHp(target, hp);
    lines.push(src.name + 'の威力' + power + '。SANがないため、半分の体力' + flat.amount + '。体力' + target.hp + '。');
    if (flat.amount > 0) hits.push({ side: target.side, ui: target.ui, amount: flat.amount, label: '体力' });
    if (flat.died) dead.push(target);
  } else {
    target.stagger = Math.max(0, target.stagger - power);
    lines.push(src.name + 'の威力' + power + 'がSANダメージ。混乱抵抗' + target.stagger + '。');
    hits.push({ side: target.side, ui: target.ui, amount: power, label: 'SAN' });
    if (!target.staggered && target.stagger <= 0) queueBreak(broken, target, src);
  }
  var rolls = {};
  var types = {};
  rolls[src.side] = power;
  types[src.side] = type;
  emit(events, battle, {
    kind: 'onesided',
    cls: hits.length ? 'hit' : 'dim',
    actor: src.side,
    outcome: src.side,
    rolls: rolls,
    types: types,
    hits: hits,
    focus: focus,
    text: lines.join('')
  });
  broken.forEach(function (unit) { finishBreak(unit, events, battle); });
  dead.forEach(function (unit) { finishDeath(unit, events, battle); });
}

function flushSan(battle, src, target, bag, events, speedDie) {
  (bag || []).forEach(function (entry) {
    dealSanPower(battle, src, target, entry.power, events, speedDie, entry.type);
  });
}

function contestRolls(ally, foe, a, b, speedA, speedB) {
  var ar;
  var br;
  var ties = [];
  var tries = 0;
  do {
    ar = rollPower(ally, speedA.page, a);
    br = rollPower(foe, speedB.page, b);
    tries += 1;
    if (ar !== br) break;
    var aLocked = a.fixed != null || (!a.rolls && a.min === a.max);
    var bLocked = b.fixed != null || (!b.rolls && b.min === b.max);
    if (aLocked && bLocked) break;
    ties.push({ player: ar, enemy: br });
  } while (tries < 24);
  return { ar: ar, br: br, ties: ties };
}

function judgeDice(a, b, ar, br) {
  var out = {
    winner: 'tie',
    rawToA: 0,
    rawToB: 0,
    aConsumed: true,
    bConsumed: true,
    aFixed: null,
    bFixed: null,
    note: '出目が同じで、これ以上振り直せない。両方のダイスが消えた。'
  };
  if (ar === br) return protectUnbreakable(a, b, out);
  var aWins = ar > br;
  var win = aWins ? a : b;
  var lose = aWins ? b : a;
  var winRoll = aWins ? ar : br;
  var diff = Math.abs(ar - br);
  out.winner = aWins ? 'a' : 'b';
  if (lose.type === 'evade' && isOffense(win.type)) {
    if (aWins) out.rawToB = winRoll;
    else out.rawToA = winRoll;
    out.note = '回避が負けたので、攻撃側の出目がそのまま通る。';
    return protectUnbreakable(a, b, out);
  }
  if (win.type === 'evade' && isOffense(lose.type)) {
    if (aWins) {
      out.aConsumed = false;
      out.aFixed = diff;
    } else {
      out.bConsumed = false;
      out.bFixed = diff;
    }
    out.note = '回避が勝ち、残り' + diff + 'で次のダイスに対抗する。';
    return protectUnbreakable(a, b, out);
  }
  if (isOffense(win.type) && (isOffense(lose.type) || lose.type === 'block')) {
    if (aWins) out.rawToB = diff;
    else out.rawToA = diff;
    out.note = lose.type === 'block' ? '防御を上回った差が通る。' : '出目の差だけ通る。';
    return protectUnbreakable(a, b, out);
  }
  if (win.type === 'block' && isOffense(lose.type)) {
    out.note = '防御が受けきった。';
    return protectUnbreakable(a, b, out);
  }
  out.note = 'ダメージはない。';
  return protectUnbreakable(a, b, out);
}

function breakResist(unit) {
  return (unit.mind && unit.mind.breakResist) || 'fatal';
}

function resistNow(unit) {
  if (!unit.staggered) return { slash: unit.resist.slash, pierce: unit.resist.pierce, blunt: unit.resist.blunt };
  var key = breakResist(unit);
  return { slash: key, pierce: key, blunt: key };
}

function applyDamage(unit, type, raw) {
  var key = resistNow(unit)[type];
  var mult = RES_MULT[key];
  var amount = Math.floor(raw * mult);
  if (amount < 0) amount = 0;
  var hpAmount = amount;
  var sanAmount = amount;
  var guard = 0;
  var sanUp = 0;
  if (amount > 0) {
    hpAmount += statusPotency(unit, 'fragile');
    guard = Math.min(hpAmount, statusPotency(unit, 'protect'));
    hpAmount -= guard;
    sanUp = statusPotency(unit, 'staggerFragile');
    sanAmount += sanUp;
  }
  unit.hp = Math.max(0, unit.hp - hpAmount);
  unit.stagger = Math.max(0, unit.stagger - sanAmount);
  if (unit.hp <= 0) unit.dead = true;
  return {
    amount: hpAmount,
    san: sanAmount,
    sanUp: sanUp,
    protect: guard,
    mult: mult,
    key: key,
    broke: !unit.dead && !unit.staggered && unit.stagger <= 0,
    died: unit.dead
  };
}

function hitText(unit, type, raw, result) {
  var extra = '';
  if (result.protect) extra += '保護で体力ダメージ-' + result.protect + '。';
  if (result.sanUp) extra += '混乱脆弱でSANダメージ+' + result.sanUp + '。';
  return unit.name + 'へ' + DIE_LABEL[type] + raw + '（' + RES_LABEL[result.key] + '×' + result.mult + ' → ' + result.amount + '）。' + extra + '体力' + unit.hp + '、混乱抵抗' + unit.stagger + '。';
}

function finishBreak(unit, events, battle) {
  if (!unit || unit.dead || unit.staggered || unit.stagger > 0) return;
  if (unit.brokenBy && !unit.brokenBy.dead) unit.brokenBy.staggeredEnemy = true;
  unit.brokenBy = null;
  unit.staggered = true;
  unit.staggerHold = 2;
  var gained = gainStatuses(unit, unit.mind.onBreak);
  emit(events, battle, {
    kind: 'stagger',
    cls: 'bad',
    target: unit.side,
    ui: unit.ui,
    text: unit.name + 'は混乱した。速度ダイスは残るが灰色になり、この幕の残りと次の幕は行動できない。受けるダメージの抵抗はすべて' +
      (breakResist(unit) === 'weak' ? '弱点' : RES_LABEL[breakResist(unit)]) + 'になる。' +
      (gained.length ? gained.join('') : '')
  });
}

function finishDeath(unit, events, battle) {
  if (!unit || !unit.dead) return;
  emit(events, battle, {
    kind: 'death',
    cls: 'bad',
    target: unit.side,
    ui: unit.ui,
    text: unit.name + 'は倒れた。'
  });
  if (battle.over) return;
  var alliesGone = wiped(battle.allies);
  var foesGone = wiped(battle.foes);
  if (!alliesGone && !foesGone) return;
  battle.over = true;
  if (alliesGone && foesGone) battle.winner = null;
  else battle.winner = alliesGone ? 'enemy' : 'player';
}

function resolveOneDie(battle, atk, def, dice, index, speedDie, events, lead) {
  var die = dice[index];
  var focus = atk.side === 'player'
    ? { player: speedDie.slot, playerUi: atk.ui, enemy: -1, enemyUi: -1 }
    : { player: -1, playerUi: -1, enemy: speedDie.slot, enemyUi: atk.ui };
  if (!isOffense(die.type)) {
    die.shown = DIE_SHORT[die.type] + ' なし';
    var blank = emptyColumn(def);
    var self = sideColumn(atk, speedDie, dice, index, true);
    var cols = atk.side === 'player' ? { left: self, right: blank } : { left: blank, right: self };
    var fizzleTypes = {};
    fizzleTypes[atk.side] = die.type;
    emit(events, battle, {
      kind: 'fizzle',
      cls: 'dim',
      actor: atk.side,
      focus: focus,
      types: fizzleTypes,
      left: cols.left,
      right: cols.right,
      text: (lead || '') + atk.name + 'の' + DIE_LABEL[die.type] + 'は、受けるダイスがなく効果がない。'
    });
    return;
  }
  var roll = rollPower(atk, speedDie.page, die);
  die.shown = DIE_SHORT[die.type] + ' ' + roll;
  var boost = boostedRaw(atk, die, speedDie.speed, roll, def);
  if (!boost.empty) markAttacked(def, die);
  var result = boost.empty
    ? { amount: 0, key: resistNow(def)[die.type], broke: false, died: def.dead }
    : applyDamage(def, die.type, boost.raw);
  var selfCol = sideColumn(atk, speedDie, dice, index, true);
  var defCol = emptyColumn(def);
  var placed = atk.side === 'player' ? { left: selfCol, right: defCol } : { left: defCol, right: selfCol };
  var rolls = {};
  var types = {};
  rolls[atk.side] = roll;
  types[atk.side] = die.type;
  var hits = boost.empty ? [] : [{ side: def.side, ui: def.ui, amount: result.amount, key: result.key }];
  var lines = [(lead || '一方攻撃。') + die.shown + '。'];
  boostLines(atk, boost, lines);
  if (!boost.empty) lines.push(hitText(def, die.type, boost.raw, result));
  var broken = [];
  var dead = [];
  if (result.broke) queueBreak(broken, def, atk);
  if (result.died) dead.push(def);
  if (roll > 0 && !boost.empty) {
    applyOnHit(atk, def, die, lines, hits, broken, dead, result.amount);
    afterHit(atk, def, die, speedDie.page, lines);
  }
  emit(events, battle, {
    kind: 'onesided',
    cls: result.amount > 0 || hits.length > 1 ? 'hit' : 'dim',
    actor: atk.side,
    outcome: atk.side,
    rolls: rolls,
    types: types,
    hits: hits,
    focus: focus,
    left: placed.left,
    right: placed.right,
    text: lines.join('')
  });
  broken.forEach(function (unit) { finishBreak(unit, events, battle); });
  dead.forEach(function (unit) { finishDeath(unit, events, battle); });
}

function resolveContested(battle, ally, foe, aDice, bDice, cursor, speedA, speedB, events, ctx) {
  var ai = cursor.ai;
  var bi = cursor.bi;
  var a = aDice[ai];
  var b = bDice[bi];
  if (isDefense(a.type) && isDefense(b.type) && !isMatchGuard(speedA.page) && !isMatchGuard(speedB.page)) {
    a.shown = DIE_SHORT[a.type] + ' 相殺';
    b.shown = DIE_SHORT[b.type] + ' 相殺';
    var cancelLines = [];
    if (ctx.header) {
      cancelLines.push(ctx.header);
      ctx.header = '';
    }
    cancelLines.push(a.shown + ' 対 ' + b.shown + '。防御同士のため相殺。マッチは起きない。');
    emit(events, battle, {
      kind: 'cancel',
      cls: 'dim',
      outcome: 'tie',
      types: { player: a.type, enemy: b.type },
      focus: { player: speedA.slot, playerUi: ally.ui, enemy: speedB.slot, enemyUi: foe.ui },
      left: sideColumn(ally, speedA, aDice, ai, true),
      right: sideColumn(foe, speedB, bDice, bi, true),
      text: cancelLines.join('')
    });
    cursor.ai += 1;
    cursor.bi += 1;
    return;
  }
  var rolled = contestRolls(ally, foe, a, b, speedA, speedB);
  var ar = rolled.ar;
  var br = rolled.br;
  var focus = { player: speedA.slot, playerUi: ally.ui, enemy: speedB.slot, enemyUi: foe.ui };
  rolled.ties.forEach(function (pair) {
    a.shown = DIE_SHORT[a.type] + ' ' + pair.player;
    b.shown = DIE_SHORT[b.type] + ' ' + pair.enemy;
    var tieLines = [];
    if (ctx.header) {
      tieLines.push(ctx.header);
      ctx.header = '';
    }
    tieLines.push(a.shown + ' 対 ' + b.shown + '。同じ威力で弾き返した。');
    emit(events, battle, {
      kind: 'parry',
      cls: 'clash',
      outcome: 'tie',
      rolls: { player: pair.player, enemy: pair.enemy },
      types: { player: a.type, enemy: b.type },
      hits: [],
      focus: focus,
      left: sideColumn(ally, speedA, aDice, ai, false),
      right: sideColumn(foe, speedB, bDice, bi, false),
      text: tieLines.join('')
    });
  });
  if (!ctx.sanA) ctx.sanA = [];
  if (!ctx.sanB) ctx.sanB = [];
  var guardNote = '';
  var activeA = isMatchGuard(speedA.page) && !ctx.degradedA;
  var activeB = isMatchGuard(speedB.page) && !ctx.degradedB;
  if ((activeA || activeB) && ar !== br) {
    if (ar > br && activeB) {
      degradeMatchGuard(bDice);
      ctx.degradedB = true;
      ctx.sanB = [];
      br = rollPower(foe, speedB.page, b);
      guardNote = foe.name + 'のマッチ可能防御が負けた。全ダイスのd値を1にした。';
    } else if (br > ar && activeA) {
      degradeMatchGuard(aDice);
      ctx.degradedA = true;
      ctx.sanA = [];
      ar = rollPower(ally, speedA.page, a);
      guardNote = ally.name + 'のマッチ可能防御が負けた。全ダイスのd値を1にした。';
    }
    activeA = isMatchGuard(speedA.page) && !ctx.degradedA;
    activeB = isMatchGuard(speedB.page) && !ctx.degradedB;
    if ((activeA && ar > br) || (activeB && br > ar)) {
      var winA = ar > br;
      (winA ? ctx.sanA : ctx.sanB).push({ power: winA ? ar : br, type: winA ? a.type : b.type });
      a.shown = DIE_SHORT[a.type] + ' ' + ar;
      b.shown = DIE_SHORT[b.type] + ' ' + br;
      var winLines = [];
      if (ctx.header) {
        winLines.push(ctx.header);
        ctx.header = '';
      }
      if (guardNote) winLines.push(guardNote);
      winLines.push(a.shown + ' 対 ' + b.shown + '。マッチ可能防御が勝った。');
      noteClashWin(winA ? ally : foe, winLines);
      if (isOffense(b.type)) markAttacked(ally, b);
      if (isOffense(a.type)) markAttacked(foe, a);
      emit(events, battle, {
        kind: 'clash',
        cls: 'clash',
        outcome: winA ? 'player' : 'enemy',
        rolls: { player: ar, enemy: br },
        types: { player: a.type, enemy: b.type },
        hits: [],
        focus: focus,
        left: sideColumn(ally, speedA, aDice, ai, true),
        right: sideColumn(foe, speedB, bDice, bi, true),
        text: winLines.join('')
      });
      cursor.ai += 1;
      cursor.bi += 1;
      return;
    }
  }
  var judged = judgeDice(a, b, ar, br);
  if (judged.aFixed != null) a.fixed = judged.aFixed;
  if (judged.bFixed != null) b.fixed = judged.bFixed;
  a.shown = DIE_SHORT[a.type] + ' ' + ar;
  b.shown = DIE_SHORT[b.type] + ' ' + br;
  var lines = [];
  if (ctx.header) {
    lines.push(ctx.header);
    ctx.header = '';
  }
  if (guardNote) lines.push(guardNote);
  lines.push(a.shown + ' 対 ' + b.shown + '。' + judged.note);
  markAttacked(foe, a);
  markAttacked(ally, b);
  var broken = [];
  var dead = [];
  var hits = [];
  if (judged.rawToB > 0) {
    var boostB = boostedRaw(ally, a, speedA.speed, judged.rawToB, foe);
    boostLines(ally, boostB, lines);
  }
  if (judged.rawToB > 0 && !boostB.empty) {
    var toEnemy = applyDamage(foe, a.type, boostB.raw);
    lines.push(hitText(foe, a.type, boostB.raw, toEnemy));
    hits.push({ side: 'enemy', ui: foe.ui, amount: toEnemy.amount, key: toEnemy.key });
    if (toEnemy.broke) queueBreak(broken, foe, ally);
    if (toEnemy.died) dead.push(foe);
    applyOnHit(ally, foe, a, lines, hits, broken, dead, toEnemy.amount);
    afterHit(ally, foe, a, speedA.page, lines);
  }
  if (judged.rawToA > 0) {
    var boostA = boostedRaw(foe, b, speedB.speed, judged.rawToA, ally);
    boostLines(foe, boostA, lines);
  }
  if (judged.rawToA > 0 && !boostA.empty) {
    var toPlayer = applyDamage(ally, b.type, boostA.raw);
    lines.push(hitText(ally, b.type, boostA.raw, toPlayer));
    hits.push({ side: 'player', ui: ally.ui, amount: toPlayer.amount, key: toPlayer.key });
    if (toPlayer.broke) queueBreak(broken, ally, foe);
    if (toPlayer.died) dead.push(ally);
    applyOnHit(foe, ally, b, lines, hits, broken, dead, toPlayer.amount);
    afterHit(foe, ally, b, speedB.page, lines);
  }
  if (judged.winner === 'a' && a.type === 'evade' && isOffense(b.type)) noteEvade(ally, a, lines);
  else if (judged.winner === 'b' && b.type === 'evade' && isOffense(a.type)) noteEvade(foe, b, lines);
  if (judged.winner === 'a') {
    dieWin(ally, a, aDice[ai + 1], lines);
    noteClashWin(ally, lines);
  } else if (judged.winner === 'b') {
    dieWin(foe, b, bDice[bi + 1], lines);
    noteClashWin(foe, lines);
  }
  var cls = 'clash';
  if (judged.rawToA > 0 || judged.rawToB > 0) cls = 'hit';
  else if (judged.winner === 'tie') cls = 'dim';
  emit(events, battle, {
    kind: 'clash',
    cls: cls,
    outcome: judged.winner === 'a' ? 'player' : judged.winner === 'b' ? 'enemy' : 'tie',
    rolls: { player: ar, enemy: br },
    types: { player: a.type, enemy: b.type },
    hits: hits,
    focus: focus,
    left: sideColumn(ally, speedA, aDice, ai, judged.aConsumed),
    right: sideColumn(foe, speedB, bDice, bi, judged.bConsumed),
    text: lines.join('')
  });
  broken.forEach(function (unit) { finishBreak(unit, events, battle); });
  dead.forEach(function (unit) { finishDeath(unit, events, battle); });
  if (judged.aConsumed) cursor.ai += 1;
  else if (a.unbreakable) a.clashed = true;
  if (judged.bConsumed) cursor.bi += 1;
  else if (b.unbreakable) b.clashed = true;
}

function missLead(unit, dice, index, spilled) {
  if (spilled.done) return '';
  spilled.done = true;
  if (unit.staggered) return unit.name + 'は混乱していてダイスを出せない。';
  if (index >= dice.length) return '向かいのダイスが尽きた。';
  return '';
}

function resolveClash(battle, ally, foe, speedA, speedB, events) {
  var prepA = openSkill(ally, speedA.page, foe, speedA.speed, true);
  var prepB = openSkill(foe, speedB.page, ally, speedB.speed, true);
  var aDice = prepA.dice;
  var bDice = prepB.dice;
  var cursor = { ai: 0, bi: 0 };
  var spilled = { done: false };
  var ctx = {
    header: 'マッチ。' + ally.name + '「' + speedA.page.name + '」速度' + speedA.speed +
      ' 対 ' + foe.name + '「' + speedB.page.name + '」速度' + speedB.speed + '。' +
      prepA.notes.join('') + prepB.notes.join(''),
    sanA: [],
    sanB: [],
    degradedA: false,
    degradedB: false
  };
  var laterA = [];
  var laterB = [];
  while (cursor.ai < aDice.length || cursor.bi < bDice.length) {
    if (battle.over || ally.dead || foe.dead) return;
    var aOk = cursor.ai < aDice.length && !ally.staggered && !ally.dead;
    var bOk = cursor.bi < bDice.length && !foe.staggered && !foe.dead;
    if (aOk && bOk) {
      resolveContested(battle, ally, foe, aDice, bDice, cursor, speedA, speedB, events, ctx);
      continue;
    }
    if (aOk && aDice[cursor.ai].clashed) { laterA.push(cursor.ai); cursor.ai += 1; continue; }
    if (bOk && bDice[cursor.bi].clashed) { laterB.push(cursor.bi); cursor.bi += 1; continue; }
    if (aOk) {
      if (isMatchGuard(speedA.page) && !ctx.degradedA) {
        var guardDieA = aDice[cursor.ai];
        var guardRollA = rollPower(ally, speedA.page, guardDieA);
        guardDieA.shown = DIE_SHORT[guardDieA.type] + ' ' + guardRollA;
        ctx.sanA.push({ power: guardRollA, type: guardDieA.type });
        cursor.ai += 1;
        continue;
      }
      var leadA = missLead(foe, bDice, cursor.bi, spilled);
      resolveOneDie(battle, ally, foe, aDice, cursor.ai, speedA, events, leadA);
      cursor.ai += 1;
      continue;
    }
    if (bOk) {
      if (isMatchGuard(speedB.page) && !ctx.degradedB) {
        var guardDieB = bDice[cursor.bi];
        var guardRollB = rollPower(foe, speedB.page, guardDieB);
        guardDieB.shown = DIE_SHORT[guardDieB.type] + ' ' + guardRollB;
        ctx.sanB.push({ power: guardRollB, type: guardDieB.type });
        cursor.bi += 1;
        continue;
      }
      var leadB = missLead(ally, aDice, cursor.ai, spilled);
      resolveOneDie(battle, foe, ally, bDice, cursor.bi, speedB, events, leadB);
      cursor.bi += 1;
      continue;
    }
    return;
  }
  if (!ctx.degradedA) flushSan(battle, ally, foe, ctx.sanA, events, speedA);
  if (!ctx.degradedB) flushSan(battle, foe, ally, ctx.sanB, events, speedB);
  laterA.forEach(function (index) {
    if (battle.over || ally.dead || foe.dead || ally.staggered) return;
    resolveOneDie(battle, ally, foe, aDice, index, speedA, events, missLead(foe, bDice, bDice.length, spilled));
  });
  laterB.forEach(function (index) {
    if (battle.over || ally.dead || foe.dead || foe.staggered) return;
    resolveOneDie(battle, foe, ally, bDice, index, speedB, events, missLead(ally, aDice, aDice.length, spilled));
  });
}

function resolveOneSided(battle, atk, def, speedDie, events) {
  var prep = openSkill(atk, speedDie.page, def, speedDie.speed);
  var dice = prep.dice;
  var lead = '一方攻撃。' + atk.name + '「' + speedDie.page.name + '」速度' + speedDie.speed + '。' + prep.notes.join('');
  for (var i = 0; i < dice.length; i++) {
    if (battle.over || atk.dead || def.dead || atk.staggered) return;
    resolveOneDie(battle, atk, def, dice, i, speedDie, events, i === 0 ? lead : '');
  }
}

function dieOn(units, ui, slot) {
  var unit = null;
  for (var i = 0; i < units.length; i++) if (units[i].ui === ui) unit = units[i];
  if (!unit || !unit.speedDice[slot]) return null;
  return { unit: unit, die: unit.speedDice[slot] };
}

function flatAt(units, index) {
  var n = 0;
  for (var i = 0; i < units.length; i++) {
    if (units[i].dead) continue;
    var dice = units[i].speedDice;
    if (index < n + dice.length) return { unit: units[i], die: dice[index - n] };
    n += dice.length;
  }
  return null;
}

function firstLiving(units) {
  for (var i = 0; i < units.length; i++) if (!units[i].dead) return units[i];
  return null;
}

function resolveGuardDice(battle, atk, def, atkSpeed, defSpeed, events) {
  var atkPrep = openSkill(atk, atkSpeed.page, def, atkSpeed.speed);
  var defPrep = openSkill(def, defSpeed.page, atk, defSpeed.speed);
  var lead = '一方攻撃。' + atk.name + '「' + atkSpeed.page.name + '」を、' + def.name + 'の防御ダイスが受ける。' + atkPrep.notes.join('') + defPrep.notes.join('');
  for (var i = 0; i < atkPrep.dice.length; i++) {
    if (battle.over || atk.dead || def.dead || atk.staggered) return;
    var die = atkPrep.dice[i];
    var roll = rollPower(atk, atkSpeed.page, die);
    die.shown = DIE_SHORT[die.type] + ' ' + roll;
    var guard = defPrep.dice[i];
    var guardRoll = null;
    var raw = roll;
    if (guard && !def.staggered && !def.dead) {
      guardRoll = rollPower(def, defSpeed.page, guard);
      guard.shown = DIE_SHORT[guard.type] + ' ' + guardRoll;
      raw = Math.max(0, roll - guardRoll);
    }
    if (!isOffense(die.type)) {
      emit(events, battle, {
        kind: 'fizzle',
        cls: 'dim',
        actor: atk.side,
        focus: atk.side === 'player'
          ? { player: atkSpeed.slot, playerUi: atk.ui, enemy: defSpeed.slot, enemyUi: def.ui }
          : { player: defSpeed.slot, playerUi: def.ui, enemy: atkSpeed.slot, enemyUi: atk.ui },
        text: (i === 0 ? lead : '') + atk.name + 'の' + DIE_LABEL[die.type] + 'は攻撃ダイスではない。'
      });
      continue;
    }
    var boost = boostedRaw(atk, die, atkSpeed.speed, raw, def);
    if (boost.empty) raw = 0;
    else markAttacked(def, die);
    var result = raw > 0 ? applyDamage(def, die.type, boost.raw) : { amount: 0, key: resistNow(def)[die.type], broke: false, died: def.dead };
    var lines = [(i === 0 ? lead : '') + die.shown];
    if (guardRoll != null) lines.push('、防御 ' + guard.shown + '。' + (boost.empty ? '' : 'ダメージ' + raw + '。'));
    else lines.push('。受ける防御ダイスがない。');
    boostLines(atk, boost, lines);
    if (raw > 0) lines.push(hitText(def, die.type, boost.raw, result));
    else if (!boost.empty && guard && guard.type === 'evade') noteEvade(def, guard, lines);
    else if (!boost.empty) lines.push(def.name + 'はダメージを受けない。');
    var hits = raw > 0 ? [{ side: def.side, ui: def.ui, amount: result.amount, key: result.key }] : [];
    var broken = [];
    var dead = [];
    if (result.broke) queueBreak(broken, def, atk);
    if (result.died) dead.push(def);
    if (raw > 0) {
      applyOnHit(atk, def, die, lines, hits, broken, dead, result.amount);
      afterHit(atk, def, die, atkSpeed.page, lines);
    }
    var rolls = {};
    var types = {};
    rolls[atk.side] = roll;
    types[atk.side] = die.type;
    if (guardRoll != null) {
      rolls[def.side] = guardRoll;
      types[def.side] = guard.type;
    }
    var focus = atk.side === 'player'
      ? { player: atkSpeed.slot, playerUi: atk.ui, enemy: defSpeed.slot, enemyUi: def.ui }
      : { player: defSpeed.slot, playerUi: def.ui, enemy: atkSpeed.slot, enemyUi: atk.ui };
    emit(events, battle, {
      kind: 'onesided',
      cls: result.amount > 0 ? 'hit' : 'dim',
      actor: atk.side,
      outcome: raw > 0 ? atk.side : 'tie',
      rolls: rolls,
      types: types,
      hits: hits,
      focus: focus,
      text: lines.join('')
    });
    broken.forEach(function (unit) { finishBreak(unit, events, battle); });
    dead.forEach(function (unit) { finishDeath(unit, events, battle); });
  }
}

function buildEngagements(battle) {
  var pairs = pairDice(flatDice(battle.allies), flatDice(battle.foes));
  return pairs.map(function (row) {
    if (row.kind === 'clash' || row.kind === 'cancel') {
      var ally = dieOn(battle.allies, row.playerUi, row.player);
      var foe = dieOn(battle.foes, row.enemyUi, row.enemy);
      return { kind: row.kind, speed: row.speed, ally: ally.unit, foe: foe.unit, player: ally.die, enemy: foe.die };
    }
    var mine = row.side === 'player' ? battle.allies : battle.foes;
    var theirs = row.side === 'player' ? battle.foes : battle.allies;
    var self = dieOn(mine, row.ui, row.slot);
    var aimed = row.target == null ? null : flatAt(theirs, row.target);
    return {
      kind: 'onesided',
      speed: row.speed,
      side: row.side,
      ui: row.ui,
      slot: row.slot,
      unit: self.unit,
      die: self.die,
      targetUnit: aimed ? aimed.unit : firstLiving(theirs),
      targetDie: aimed ? aimed.die : null
    };
  });
}

function strikeOneSided(battle, atk, def, atkSpeed, defSpeed, events) {
  if (atkSpeed.page && atkSpeed.page.kind === 'attack' && defSpeed && defSpeed.page && isNormalGuard(defSpeed.page) && !def.staggered) {
    resolveGuardDice(battle, atk, def, atkSpeed, defSpeed, events);
    return;
  }
  resolveOneSided(battle, atk, def, atkSpeed, events);
}

function resolveSkillCancel(battle, ally, foe, speedA, speedB, events) {
  if (speedA.page && isGuardPage(speedA.page)) ally.usedGuard = true;
  if (speedB.page && isGuardPage(speedB.page)) foe.usedGuard = true;
  emit(events, battle, {
    kind: 'cancel',
    cls: 'dim',
    outcome: 'tie',
    types: { player: 'block', enemy: 'block' },
    focus: { player: speedA.slot, playerUi: ally.ui, enemy: speedB.slot, enemyUi: foe.ui },
    text: ally.name + '「' + speedA.page.name + '」と' + foe.name + '「' + speedB.page.name + '」は防御スキル同士のため相殺。'
  });
}

function runEngagement(battle, eng, events) {
  if (battle.over) return;
  if (eng.kind === 'onesided') {
    if (!eng.unit || eng.unit.staggered || eng.unit.dead || !eng.targetUnit || eng.targetUnit.dead) return;
    strikeOneSided(battle, eng.unit, eng.targetUnit, eng.die, eng.targetDie, events);
    return;
  }
  if (eng.kind === 'cancel') {
    if (!eng.ally || !eng.foe || eng.ally.dead || eng.foe.dead) return;
    if (eng.ally.staggered && eng.foe.staggered) return;
    if (eng.ally.staggered) {
      strikeOneSided(battle, eng.foe, eng.ally, eng.enemy, eng.player, events);
      return;
    }
    if (eng.foe.staggered) {
      strikeOneSided(battle, eng.ally, eng.foe, eng.player, eng.enemy, events);
      return;
    }
    resolveSkillCancel(battle, eng.ally, eng.foe, eng.player, eng.enemy, events);
    return;
  }
  if (!eng.ally || !eng.foe || eng.ally.dead || eng.foe.dead) return;
  if (eng.ally.staggered && eng.foe.staggered) return;
  if (eng.ally.staggered) {
    resolveOneSided(battle, eng.foe, eng.ally, eng.enemy, events);
    return;
  }
  if (eng.foe.staggered) {
    resolveOneSided(battle, eng.ally, eng.foe, eng.player, events);
    return;
  }
  resolveClash(battle, eng.ally, eng.foe, eng.player, eng.enemy, events);
}

function emitOver(battle, events) {
  if (!battle.over || battle.overEmitted) return;
  battle.overEmitted = true;
  var text = battle.winner === 'player'
    ? '味方の勝ち。'
    : battle.winner === 'enemy'
      ? '相手の勝ち。'
      : '相打ち。';
  emit(events, battle, {
    kind: 'over',
    cls: battle.winner === 'player' ? 'win' : 'bad',
    text: text,
    winner: battle.winner
  });
}

function padPlan(list, n) {
  var out = (list || []).slice(0, n);
  while (out.length < n) out.push(null);
  return out;
}

function confirmScene(battle, plans) {
  if (battle.over) return { error: '戦闘は終わっています', events: [] };
  var foePlans = battle.foePlan || battle.foes.map(function (unit) {
    return { skills: unit.speedDice.map(function () { return null; }), targets: unit.speedDice.map(function () { return null; }) };
  });
  var allyPacked = battle.allies.map(function (unit, ui) {
    var plan = plans && plans[ui] ? plans[ui] : {};
    return {
      ids: padPlan(plan.ids, unit.speedDice.length),
      targets: padPlan(plan.targets, unit.speedDice.length)
    };
  });
  for (var i = 0; i < battle.allies.length; i++) {
    var err = validatePlan(battle.allies[i], allyPacked[i].ids);
    if (err) return { error: err, events: [] };
  }
  for (var f = 0; f < battle.foes.length; f++) {
    var foeErr = validatePlan(battle.foes[f], foePlans[f].skills);
    if (foeErr) return { error: foeErr, events: [] };
  }
  battle.allies.forEach(function (unit, ui) {
    applyPlan(unit, allyPacked[ui].ids, allyPacked[ui].targets);
  });
  battle.foes.forEach(function (unit, ui) {
    applyPlan(unit, foePlans[ui].skills, foePlans[ui].targets);
  });
  battle.foePlan = null;
  var events = [];
  var engagements = buildEngagements(battle);
  if (!engagements.length) {
    emit(events, battle, { kind: 'banner', text: '両者ともスキルを使わなかった。' });
  }
  engagements.forEach(function (eng) { runEngagement(battle, eng, events); });
  if (!battle.over) endScene(battle, events);
  emitOver(battle, events);
  return { error: null, events: events };
}
