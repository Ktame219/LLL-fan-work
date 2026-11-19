CHARACTER_DATA.push(
{
  "id": "owen",
  "name": "オーウェン",
  "team": "select",
  "portrait": "assets/units/Owen/portrait.png",
  "motions": {
    "move": "assets/units/Owen/01-rush.png",
    "slash": "assets/units/Owen/03-downward-slash.png",
    "pierce": "assets/units/Owen/06-horizontal-slash.png",
    "guard": "assets/units/Owen/04-guard.png",
    "hit": "assets/units/Owen/07-hit.png"
  },
  "head": "assets/units/Owen/head.png",
  "stateshead": "assets/units/Owen/stateshead.png",
  "office": "ユン事務所1級フィクサー",
  "blurb": "",
  "hp": 105,
  "stagger": 45,
  "speed": "2d3",
  "resist": { "slash": "normal", "pierce": "endured", "blunt": "weak" },
  "attack": "slash",
  "keywords": [],
  "mind": {
    "name": "哀しみ",
    "icon": "assets/mental_pattern_icons/panic.png",
    "lowText": "幕開始時、混乱脆弱2を得る",
    "breakText": "ダメージ量減少5と脆弱3を得て、全ての耐性が弱点になる",
    "low": [{ "status": "staggerFragile", "amount": 2 }],
    "onBreak": [
      { "status": "damageDown", "amount": 5 },
      { "status": "fragile", "amount": 3 }
    ],
    "breakResist": "weak",
    "onRecover": []
  },
  "attacks": [
    {
      "id": "ow-steady",
      "name": "順調な一撃",
      "attr": "slash",
      "motion": "assets/units/Owen/03-downward-slash.png",
      "art": "assets/skills/Yun's_office/A_smooth_hit.png",
      "text": "",
      "dice": [
        {
          "type": "slash",
          "roll": "4d3",
          "text": "的中時、脆弱1を付与",
          "onHit": [{ "op": "gain", "status": "fragile", "amount": 1 }]
        },
        { "type": "slash", "roll": "6d2" }
      ]
    },
    {
      "id": "ow-overwhelm",
      "name": "圧倒",
      "attr": "block",
      "matchable": true,
      "motion": "assets/units/Owen/04-guard.png",
      "art": "assets/skills/Yun's_office/Overwhelm.png",
      "text": "使用時、次の幕にて保護2を得る",
      "onUse": { "gain": [{ "status": "protect", "amount": 2, "when": "next" }] },
      "dice": [
        { "type": "block", "roll": "2d6", "unbreakable": true, "text": "破壊不能ダイス" },
        { "type": "block", "roll": "2d6", "unbreakable": true, "text": "破壊不能ダイス" },
        { "type": "block", "roll": "2d6", "unbreakable": true, "text": "破壊不能ダイス" }
      ]
    },
    {
      "id": "ow-spin",
      "name": "回転斬",
      "attr": "slash",
      "motion": "assets/units/Owen/05-spinning-slash.png",
      "art": "assets/skills/Yun's_office/Spinning_Slash.png",
      "text": "",
      "dice": [
        {
          "type": "slash",
          "roll": "4d3",
          "text": "的中時、相手の次のダイスの最大値-3",
          "onHit": [{ "op": "maxDown", "amount": 3 }]
        },
        {
          "type": "slash",
          "roll": "4d3",
          "text": "的中時、相手の次のダイスの最大値-3",
          "onHit": [{ "op": "maxDown", "amount": 3 }]
        },
        { "type": "slash", "roll": "4d3" }
      ]
    },
    {
      "id": "ow-cleave",
      "name": "斬り開く一撃",
      "attr": "slash",
      "motion": "assets/units/Owen/06-horizontal-slash.png",
      "art": "assets/skills/Yun's_office/A_slash_that_cuts_through.png",
      "text": "スキル使用時、次の幕にて、全ての味方に保護1を付与",
      "onUse": { "gain": [{ "status": "protect", "amount": 1, "when": "next", "party": true }] },
      "dice": [
        {
          "type": "slash",
          "roll": "4d4",
          "text": "的中時、次の幕にて、束縛1を付与",
          "onHit": [{ "op": "gain", "status": "bind", "amount": 1, "when": "next" }]
        },
        {
          "type": "slash",
          "roll": "4d4",
          "text": "的中時、次の幕にて、武装解除1を付与",
          "onHit": [{ "op": "gain", "status": "disarm", "amount": 1, "when": "next" }]
        },
        { "type": "pierce", "roll": "4d4" }
      ]
    }
  ],
  "defense": {
    "id": "ow-slow",
    "name": "遅い",
    "attr": "evade",
    "motion": "assets/units/Owen/02-dodge.png",
    "art": "assets/skills/Yun's_office/Slow.png",
    "text": "",
    "dice": [
      {
        "type": "evade",
        "roll": "3d6",
        "text": "マッチ勝利時、自分の次のダイス威力+6",
        "onWin": [{ "op": "nextDiePower", "amount": 6 }]
      },
      {
        "type": "slash",
        "roll": "2d4",
        "text": "的中時、次の幕にて、脆弱2付与",
        "onHit": [{ "op": "gain", "status": "fragile", "amount": 2, "when": "next" }]
      }
    ]
  },
  "passives": [
    {
      "id": "ow-courage",
      "name": "報われた勇気",
      "text": "効果：ダメージを与えたとき、次の幕にてパワー1を獲得",
      "hooks": [
        { "on": "hit", "op": "gain", "status": "power", "amount": 1, "self": true, "when": "next" }
      ]
    },
    {
      "id": "ow-senses",
      "name": "研ぎ澄まされた感覚",
      "text": "効果：自身の速度が3以上なら回避ダイス威力+3",
      "hooks": [
        { "on": "power", "op": "evadePower", "speed": 3, "amount": 3 }
      ]
    },
    {
      "id": "ow-fixer",
      "name": "1級フィクサーの斬撃",
      "text": "効果：斬撃ダメージ+6",
      "hooks": [
        { "on": "damage", "op": "typeDamage", "type": "slash", "amount": 6 }
      ]
    }
  ]
}
);
