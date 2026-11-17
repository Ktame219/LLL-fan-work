CHARACTER_DATA.push(
{
  "id": "parensaran",
  "name": "パレンサラン",
  "team": "select",
  "portrait": "assets/units/Parensaran/portrait.png",
  "motions": {
    "move": "assets/units/Parensaran/01-move.png",
    "slash": "assets/units/Parensaran/02-slash.png",
    "pierce": "assets/units/Parensaran/03-blunt-strike.png",
    "blunt": "assets/units/Parensaran/03-blunt-strike.png",
    "guard": "assets/units/Parensaran/04-dodge.png",
    "hit": "assets/units/Parensaran/04-dodge.png"
  },
  "head": "assets/units/Parensaran/head.png",
  "stateshead": "assets/units/Parensaran/stateshead.png",
  "office": "マリアッチ構成員",
  "blurb": "斬撃が耐性、貫通が弱点。速度は2d3。",
  "hp": 100,
  "stagger": 55,
  "speed": "2d3",
  "resist": { "slash": "endured", "pierce": "weak", "blunt": "normal" },
  "attack": "slash",
  "keywords": ["呼吸", "沈潜"],
  "mind": {
    "name": "圧倒",
    "icon": "assets/mental_pattern_icons/overwhelm.png",
    "lowText": "R開始時、武装解除2を得る",
    "breakText": "行動不能。混乱復帰時、虚弱3と脆弱5を得る",
    "low": [{ "status": "disarm", "amount": 2 }],
    "onBreak": [],
    "onRecover": [
      { "status": "feeble", "amount": 3 },
      { "status": "fragile", "amount": 5 }
    ]
  },
  "attacks": [
    {
      "id": "ps-passion",
      "name": "情熱の踊り",
      "attr": "slash",
      "motion": "assets/units/Parensaran/02-slash.png",
      "art": "assets/skills/Mariachi/passion_dance.png",
      "text": "マッチ開始時：対象の沈潜が6以上ならマッチ威力+2",
      "onUse": { "sinkingAtLeast": 6, "power": 2 },
      "dice": [
        {
          "type": "slash",
          "roll": "2d5",
          "text": "的中時、沈潜2を付与",
          "onHit": [{ "op": "gain", "status": "sinking", "amount": 2 }]
        },
        {
          "type": "slash",
          "roll": "2d4",
          "text": "的中時、沈潜2を付与",
          "onHit": [{ "op": "gain", "status": "sinking", "amount": 2 }]
        },
        { "type": "slash", "roll": "2d3" }
      ]
    },
    {
      "id": "ps-duel",
      "name": "ダンス対決",
      "attr": "pierce",
      "motion": "assets/units/Parensaran/03-blunt-strike.png",
      "art": "assets/skills/Mariachi/dance_battle.png",
      "text": "使用時：呼吸4を得る",
      "onUse": { "gain": [{ "status": "breath", "amount": 4 }] },
      "dice": [
        {
          "type": "pierce",
          "roll": "3d5",
          "text": "的中時、沈潜1を付与",
          "onHit": [{ "op": "gain", "status": "sinking", "amount": 1 }]
        },
        {
          "type": "pierce",
          "roll": "3d5",
          "text": "的中時、沈潜1を付与",
          "onHit": [{ "op": "gain", "status": "sinking", "amount": 1 }]
        },
        { "type": "pierce", "roll": "3d5" }
      ]
    },
    {
      "id": "ps-lunge",
      "name": "興が乗った刺突",
      "attr": "pierce",
      "motion": "assets/units/Parensaran/03-blunt-strike.png",
      "art": "assets/skills/Mariachi/excited_thrust.png",
      "text": "使用時：呼吸が10以上かつ自分にデバフがあるなら、ランダムにデバフを1つ除去し呼吸を5消費",
      "onUse": { "cleanse": { "breath": 10, "spend": 5 } },
      "dice": [
        {
          "type": "pierce",
          "roll": "2d9",
          "text": "的中時、沈潜2を付与",
          "onHit": [{ "op": "gain", "status": "sinking", "amount": 2 }]
        },
        {
          "type": "pierce",
          "roll": "2d7",
          "text": "的中時、沈潜2を付与",
          "onHit": [{ "op": "gain", "status": "sinking", "amount": 2 }]
        },
        {
          "type": "pierce",
          "roll": "2d7",
          "text": "クリティカルダメージ量+3",
          "critBonus": 3
        }
      ]
    },
    {
      "id": "ps-pinata",
      "name": "パニャータパーティ～！",
      "attr": "slash",
      "motion": "assets/units/Parensaran/02-slash-skull-paint.png",
      "art": "assets/skills/Mariachi/pinata_party.png",
      "text": "マッチ開始時：対象の沈潜3ごとにスキル威力+1（最大3）",
      "onUse": { "sinkingPer": 3, "powerMax": 3 },
      "dice": [
        { "type": "slash", "roll": "2d7" },
        { "type": "slash", "roll": "2d9" },
        { "type": "slash", "roll": "2d9" },
        {
          "type": "slash",
          "roll": "1d8",
          "text": "クリティカル的中時、与えたダメージ量だけSANを回復",
          "onHit": [{ "op": "healSanDealt", "if": "crit" }]
        }
      ]
    }
  ],
  "defense": {
    "id": "ps-excel",
    "name": "エクセレンテ！",
    "motion": "assets/units/Parensaran/04-dodge.png",
    "art": "assets/skills/Mariachi/excelente.png",
    "dice": [
      {
        "type": "evade",
        "roll": "8d2",
        "text": "回避成功時、SANを5回復",
        "onEvade": [{ "op": "healSan", "amount": 5 }]
      }
    ]
  },
  "passives": [
    {
      "id": "ps-party",
      "name": "パーティータイム！",
      "text": "発動条件：スキル1もしくはスキル4使用時\n効果：戦闘開始時、全ての味方のSANを1～5回復。自分のSANが30以上なら呼吸5を得る",
      "hooks": [
        { "on": "stage", "op": "partySan", "min": 1, "max": 5, "san": 30, "breath": 5 }
      ]
    },
    {
      "id": "ps-manual",
      "name": "マニュアル通り",
      "text": "効果：自分の速度が自分以外の全てのキャラクターより高いなら、スキル威力+1",
      "hooks": [
        { "on": "power", "op": "fastestPower", "amount": 1 }
      ]
    },
    {
      "id": "ps-g7",
      "name": "因子コードG-7",
      "text": "効果：マッチ勝利時、HPを5回復",
      "hooks": [
        { "on": "clashWin", "op": "heal", "amount": 5 }
      ]
    }
  ]
}
);
