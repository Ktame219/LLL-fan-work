var STATUS_INFO = {
  disarm: { name: '武装解除', max: 10, text: '[1幕] 武装解除の数だけ守備スキル威力減少（最大10）' },
  bind: { name: '束縛', max: 10, text: '[1幕] 速度が束縛の数だけ減少（最大10）' },
  feeble: { name: '虚弱', max: 10, text: '[1幕] 虚弱の数だけ戦術スキル威力減少（最大10）' },
  fragile: { name: '脆弱', max: 10, text: '[1幕] ダイスのダメージを受ける時、脆弱の数だけ受けるHPダメージが増加（最大10）' },
  staggerFragile: { name: '混乱脆弱', max: 10, text: '[1幕] ダイスのダメージを受ける時、混乱脆弱の数だけ受けるSANダメージが増加（最大10）' },
  power: { name: 'パワー', max: 10, text: '[1幕] パワーの数だけ戦術スキル威力増加（最大10）' },
  protect: { name: '保護', max: 10, text: '[1幕] 保護の数だけスキルで受けるHPダメージが減少（最大10）' },
  burn: {
    name: '火傷',
    max: 99,
    icon: 'Burn.png',
    text: '幕の終了時、火傷の数だけHPダメージを受けて火傷の数を半減（最大99）',
    lines: ['幕の終了時、火傷の数だけHPダメージを受ける', 'その後、火傷の数を半減する', '最大99']
  },
  tremor: {
    name: '振動',
    max: 99,
    icon: 'Tremor.png',
    text: '振動爆発を受けた時、振動の数だけSANダメージを受ける。幕の終了時、1減少（最大99）',
    lines: ['振動爆発を受けた時、振動の数だけSANダメージを受ける', '幕の終了時に1減少', '最大99']
  },
  tremorScorch: {
    name: '振動-灼熱',
    max: 99,
    icon: 'TremorScorch.png',
    text: '振動爆発を受けた時、数値だけSANダメージを受け、振動-灼熱と火傷の合計/2だけ憤怒HPダメージを受ける。幕の終了時、1減少（最大99）',
    lines: ['振動爆発を受けた時、数値だけSANダメージを受ける', '振動-灼熱と火傷の合計÷2だけ憤怒HPダメージを受ける', '幕の終了時に1減少', '最大99']
  },
  scorchAmmo: {
    name: '弾丸-灼熱推進弾',
    max: 99,
    icon: 'ScorchPropellantAmmo.png',
    text: '弾丸を消費するダイスのダメージ量+2。自分の速度が6以上なら追加でダメージ量+3。消費することで特定スキルの能力が向上',
    lines: ['弾丸を消費するダイスのダメージ量+2', '自分の速度が6以上なら、追加でダメージ量+3', '消費することで特定スキルの能力が向上']
  },
  damageUp: {
    name: 'ダメージ量増加',
    max: 10,
    icon: 'DamageUp.png',
    text: '[1幕] スキルで与えるダメージ量が数値だけ増加する（最大10）'
  },
  damageDown: {
    name: 'ダメージ量減少',
    max: 10,
    icon: 'DamageDown.png',
    text: '[1幕] スキルで与えるダメージ量が数値だけ減少する（最大10）'
  },
  breath: {
    name: '呼吸',
    max: 99,
    icon: 'Breath.png',
    text: '攻撃前、（呼吸の数×5）%の確率でクリティカル攻撃となる。クリティカル時、スキルの全ダイスのダメージ+2。ダイス数×3だけ呼吸が減少。幕の終了時、1減少（最大99）',
    lines: [
      '攻撃前、（呼吸の数×5）%の確率でクリティカル攻撃となる',
      'クリティカル時、スキルの全ダイスのダメージ+2',
      'そのとき、ダイス数×3だけ呼吸が減少する',
      '幕の終了時に1減少',
      '最大99'
    ]
  },
  sinking: {
    name: '沈潜',
    max: 99,
    icon: 'Sinking.png',
    text: '幕の終了時、沈潜の数だけSANダメージを受けて沈潜の数を半減。SANが存在しない、または0なら代わりに沈潜の数の半分だけHPダメージを受けて沈潜の数を半減（最大99）',
    lines: [
      '幕の終了時、沈潜の数だけSANダメージを受ける',
      'SANが無いか0なら、代わりに沈潜の数の半分だけHPダメージを受ける',
      'その後、沈潜の数を半減する',
      '最大99'
    ]
  },
  rupture: {
    name: '破裂',
    max: 99,
    icon: 'Rupture.png',
    text: '破裂爆発を受けた時、破裂の数だけHPダメージを受ける。幕の終了時、1減少（最大99）',
    lines: ['破裂爆発を受けた時、破裂の数だけHPダメージを受ける', '幕の終了時に1減少', '最大99']
  }
};

var EFFECT_INFO = {
  tremorBurst: {
    name: '振動爆発',
    icon: 'TremorBurst.png',
    lines: ['振動の数だけSANダメージを受ける']
  },
  ruptureBurst: {
    name: '破裂爆発',
    icon: 'RuptureBurst.png',
    lines: ['破裂の数だけHPダメージを受ける']
  },
  amplitude: {
    name: '振幅変換',
    icon: 'AmplitudeConversion.png',
    lines: ['対象の振動と変換された振動を別タイプの振動に変換する', '変換時、既存振動の数値は維持される']
  },
  magazine: {
    name: '弾倉変換',
    icon: 'MagazineConversion.png',
    lines: ['自分の弾丸の数だけ、弾丸-灼熱推進弾を得る', '既についている数値は維持され、そこに足される', '弾丸の数は減らない']
  }
};

var PASSIVE_ON = { stage: true, hit: true, maxHit: true, attacked: true, power: true, clashWin: true, sceneEnd: true, damage: true };
var PASSIVE_OP = { magazine: true, gain: true, nextPower: true, partySan: true, fastestPower: true, heal: true, breathSan: true, higherHp: true, guardedPower: true, evadePower: true, typeDamage: true };

function readPassives(ch) {
  var list = ch.passives || [];
  if (!Array.isArray(list)) throw new Error(ch.id + ' の passives は配列です');
  var attacks = ch.attacks || [];
  list.forEach(function (passive) {
    if (!passive || !passive.name) throw new Error(ch.id + ' のパッシブに name がありません');
    if (passive.hooks && !Array.isArray(passive.hooks)) throw new Error(passive.name + ' の hooks は配列です');
    (passive.hooks || []).forEach(function (hook) {
      if (!hook || !PASSIVE_ON[hook.on]) throw new Error(passive.name + ' の on が不正です');
      if (!PASSIVE_OP[hook.op]) throw new Error(passive.name + ' の op が不正です');
      if (hook.if && hook.if !== 'staggeredLast') throw new Error(passive.name + ' の if が不正です');
      if (hook.skill != null && (typeof hook.skill !== 'number' || hook.skill < 0)) {
        throw new Error(passive.name + ' の skill は 0 以上の数です');
      }
      if (hook.skill > attacks.length) throw new Error(passive.name + ' の skill が戦術スキルの数を超えています');
      if (hook.skill === 0 && !ch.defense) throw new Error(passive.name + ' は防御スキルを指しています');
      if (hook.op === 'gain' && !STATUS_INFO[hook.status]) throw new Error(passive.name + ' の status が不正です');
      if ((hook.op === 'gain' || hook.op === 'nextPower' || hook.op === 'fastestPower' || hook.op === 'heal' || hook.op === 'breathSan' || hook.op === 'higherHp' || hook.op === 'guardedPower' || hook.op === 'evadePower' || hook.op === 'typeDamage') && !(hook.amount > 0)) {
        throw new Error(passive.name + ' の amount が不正です');
      }
      if (hook.when && hook.when !== 'next') throw new Error(passive.name + ' の when は next です');
      if (hook.op === 'evadePower' && (hook.on !== 'power' || !(hook.speed >= 0))) throw new Error(passive.name + ' の回避威力は on が power で、speed が必要です');
      if (hook.op === 'typeDamage' && (hook.on !== 'damage' || !ATTACK_LABEL[hook.type])) throw new Error(passive.name + ' のダメージは on が damage で、type は slash / pierce / blunt です');
      if (hook.op === 'breathSan' && !(hook.breath > 0)) throw new Error(passive.name + ' の breath が不正です');
      if (hook.op === 'breathSan' && hook.on !== 'sceneEnd') throw new Error(passive.name + ' の回復は幕の終了時です');
      if (hook.op === 'higherHp' && hook.on !== 'damage') throw new Error(passive.name + ' のダメージは与えるときです');
      if (hook.op === 'guardedPower' && hook.on !== 'power') throw new Error(passive.name + ' の威力はスキル威力です');
      if (hook.op === 'partySan' && (!(hook.min >= 1) || !(hook.max >= hook.min) || !(hook.san >= 0) || !(hook.breath > 0))) {
        throw new Error(passive.name + ' の回復範囲が不正です');
      }
      if (hook.op === 'heal' && hook.on !== 'clashWin') throw new Error(passive.name + ' の回復はマッチ勝利時です');
    });
  });
  return list;
}

function parseDie(die, who) {
  if (die.roll) {
    var match = /^(\d+)d(\d+)$/i.exec(String(die.roll).trim());
    if (!match) throw new Error(who + ' のダイス ' + die.roll + ' は 2d4 のような形です');
    die.rolls = Number(match[1]);
    die.faces = Number(match[2]);
    if (die.rolls < 1 || die.faces < 1) throw new Error(who + ' のダイスが不正です');
    die.min = die.rolls;
    die.max = die.rolls * die.faces;
  }
  if (typeof die.min !== 'number' || typeof die.max !== 'number') {
    throw new Error(who + ' のダイスに出目がありません');
  }
}

var KEYWORDS = ['火傷', '出血', '振動', '破裂', '沈潜', '呼吸', '充電'];
var ATTACK_LABEL = { slash: '斬撃', pierce: '貫通', blunt: '打撃' };
var PAGE = {};
var ROSTER = {};
var ROSTER_IDS = [];
var PLAYER_IDS = [];
var ENEMY_IDS = [];
var FORMATION_KEY = 'shashimi-formation';

function emptyFormation() {
  return { presets: [[], [], [], [], []], current: 0 };
}

function readFormation() {
  var empty = emptyFormation();
  try {
    if (typeof localStorage === 'undefined') return empty;
    var raw = JSON.parse(localStorage.getItem(FORMATION_KEY) || 'null');
    if (!raw || !Array.isArray(raw.presets)) return empty;
    var presets = raw.presets.slice(0, 5).map(function (team) {
      if (!Array.isArray(team)) return [];
      var ids = [];
      team.forEach(function (id) {
        if (ROSTER[id] && ROSTER[id].team !== 'off' && ids.indexOf(id) < 0) ids.push(id);
      });
      return ids.slice(0, 5);
    });
    while (presets.length < 5) presets.push([]);
    var current = raw.current | 0;
    if (current < 0 || current > 4) current = 0;
    return { presets: presets, current: current };
  } catch (err) {
    return empty;
  }
}

function writeFormation(data) {
  try {
    localStorage.setItem(FORMATION_KEY, JSON.stringify({
      presets: data.presets,
      current: data.current
    }));
  } catch (err) {}
}

function readSpeed(ch) {
  if (typeof ch.speed === 'string' && ch.speed) {
    var match = /^(\d+)d(\d+)$/i.exec(ch.speed.trim());
    if (!match) throw new Error(ch.id + ' の speed は 3d2 のような形です');
    var rolls = Number(match[1]);
    var faces = Number(match[2]);
    if (rolls < 1 || faces < 1) throw new Error(ch.id + ' の speed が不正です');
    return {
      speedText: rolls + 'd' + faces,
      speedMin: rolls,
      speedMax: rolls * faces,
      speedRolls: rolls,
      speedFaces: faces
    };
  }
  if (typeof ch.speedMin !== 'number' || typeof ch.speedMax !== 'number') {
    throw new Error(ch.id + ' の速度がありません');
  }
  return {
    speedText: ch.speedMin + '–' + ch.speedMax,
    speedMin: ch.speedMin,
    speedMax: ch.speedMax,
    speedRolls: 0,
    speedFaces: 0
  };
}

(function () {
  var seenSkill = {};
  var teams = { player: true, select: true, off: true };
  if (!Array.isArray(CHARACTER_DATA)) throw new Error('CHARACTER_DATA がありません');
  CHARACTER_DATA.forEach(function (ch) {
    if (!ch || !ch.id) throw new Error('キャラに id がありません');
    if (ROSTER[ch.id]) throw new Error('id が重複しています: ' + ch.id);
    if (!teams[ch.team]) throw new Error(ch.id + ' の team は player / select / off です');
    var attacks = ch.attacks || [];
    if (!Array.isArray(attacks)) throw new Error(ch.id + ' の attacks は配列です');
    if (attacks.length && attacks.length !== 4) throw new Error(ch.id + ' の戦術スキルは4つです');
    if (ch.defense && !ch.defense.id) throw new Error(ch.id + ' の防御スキルが不正です');
    if (!ch.mind) throw new Error(ch.id + ' に mind がありません');
    if (ch.mind.breakResist && ['fatal', 'weak', 'normal', 'endured', 'immune'].indexOf(ch.mind.breakResist) < 0) {
      throw new Error(ch.id + ' の breakResist は fatal / weak / normal / endured / immune です');
    }
    if (ch.attack && !ATTACK_LABEL[ch.attack]) throw new Error(ch.id + ' の attack は slash / pierce / blunt です');
    if (ch.bullets != null && (typeof ch.bullets !== 'number' || ch.bullets < 0)) {
      throw new Error(ch.id + ' の bullets は0以上の数です');
    }
    if (!Array.isArray(ch.keywords)) throw new Error(ch.id + ' の keywords は配列です');
    readPassives(ch);
    ch.keywords.forEach(function (word) {
      if (KEYWORDS.indexOf(word) < 0) throw new Error(ch.id + ' のキーワードが不正です: ' + word);
    });
    var skills = attacks.slice();
    if (ch.defense) skills.push(ch.defense);
    skills.forEach(function (skill) {
      if (!skill.id || !skill.dice || !skill.dice.length) throw new Error(ch.id + ' のスキルが不正です');
      if (skill.matchable && skill !== ch.defense && attacks.indexOf(skill) < 0) throw new Error(ch.id + ' の matchable が不正です');
      skill.dice.forEach(function (die) { parseDie(die, ch.id + ' ' + skill.name); });
      if (seenSkill[skill.id]) throw new Error('スキル id が重複しています: ' + skill.id);
      seenSkill[skill.id] = true;
      PAGE[skill.id] = skill;
    });
    var speed = readSpeed(ch);
    ROSTER[ch.id] = {
      name: ch.name,
      portrait: ch.portrait,
      motions: ch.motions || null,
      head: ch.head,
      stateshead: ch.stateshead,
      office: ch.office || '',
      blurb: ch.blurb || '',
      hp: ch.hp,
      stagger: ch.stagger,
      speedCount: 1,
      speedText: speed.speedText,
      speedMin: speed.speedMin,
      speedMax: speed.speedMax,
      speedRolls: speed.speedRolls,
      speedFaces: speed.speedFaces,
      bullets: ch.bullets == null ? null : ch.bullets,
      resist: ch.resist,
      team: ch.team,
      attack: ch.attack || '',
      keywords: ch.keywords.slice(),
      attacks: attacks.map(function (skill) { return skill.id; }),
      defense: ch.defense ? ch.defense.id : null,
      passives: ch.passives || [],
      mind: {
        name: ch.mind.name,
        icon: ch.mind.icon,
        low: ch.mind.lowText || 'なし',
        breakText: ch.mind.breakText || '',
        breakResist: ch.mind.breakResist || 'fatal',
        lowEffects: ch.mind.low || [],
        onBreak: ch.mind.onBreak || [],
        onRecover: ch.mind.onRecover || []
      }
    };
    ROSTER_IDS.push(ch.id);
    if (ch.team === 'player') PLAYER_IDS.push(ch.id);
    if (ch.team === 'select') ENEMY_IDS.push(ch.id);
  });
  if (!PLAYER_IDS.length) throw new Error('team が player のキャラが必要です');
  if (!ENEMY_IDS.length) throw new Error('team が select のキャラが必要です');
})();
