CHARACTER_DATA.push(
{
  "id": "nagel",
  "name": "ナーグル",
  "team": "select",
  "portrait": "assets/units/Nagel/portrait.png",
  "motions": {
    "move": "assets/units/Nagel/01-move.png",
    "pierce": "assets/units/Nagel/02-piercing-shot.png",
    "blunt": "assets/units/Nagel/03-blunt-strike.png",
    "guard": "assets/units/Nagel/04-guard.png"
  },
  "head": "assets/units/Nagel/head.png",
  "stateshead": "assets/units/Nagel/stateshead.png",
  "office": "LCCB係長",
  "blurb": "",
  "hp": 114,
  "stagger": 50,
  "speed": "2d3",
  "bullets": 7,
  "resist": { "slash": "normal", "pierce": "endured", "blunt": "weak" },
  "attack": "blunt",
  "keywords": ["呼吸"],
  "mind": {
    "name": "萎縮",
    "icon": "assets/mental_pattern_icons/shrink.png",
    "lowText": "R開始時、束縛3を得る",
    "breakText": "虚弱3を得て、全ての耐性が脆弱になる",
    "low": [{ "status": "bind", "amount": 3 }],
    "onBreak": [{ "status": "feeble", "amount": 3 }],
    "onRecover": []
  },
  "attacks": [
    {
      "id": "ng-shove",
      "name": "押しのける",
      "attr": "blunt",
      "motion": "assets/units/Nagel/03-blunt-strike.png",
      "art": "assets/skills/LCB/push_aside.png",
      "text": "使用時：呼吸2を得る",
      "onUse": { "gain": [{ "status": "breath", "amount": 2 }] },
      "dice": [
        {
          "type": "blunt",
          "roll": "2d8",
          "text": "的中時、呼吸2を得る",
          "onHit": [{ "op": "gain", "status": "breath", "amount": 2, "self": true }]
        }
      ]
    },
    {
      "id": "ng-timing",
      "name": "タイミングを狙う",
      "attr": "evade",
      "motion": "assets/units/Nagel/04-guard.png",
      "art": "assets/skills/LCB/Timing_it_right.png",
      "text": "",
      "dice": [
        { "type": "evade", "roll": "2d9" },
        { "type": "evade", "roll": "2d7" }
      ]
    },
    {
      "id": "ng-covert",
      "name": "隠密作戦",
      "attr": "blunt",
      "motion": "assets/units/Nagel/03-blunt-strike.png",
      "art": "assets/skills/LCB/Secret_mission.png",
      "text": "自分の呼吸が7以上ならスキル威力+1",
      "onUse": { "breathAtLeast": 7, "power": 1 },
      "dice": [
        {
          "type": "blunt",
          "roll": "2d9",
          "text": "的中時、呼吸2を得る",
          "onHit": [{ "op": "gain", "status": "breath", "amount": 2, "self": true }]
        },
        {
          "type": "blunt",
          "roll": "5d2",
          "text": "クリティカル的中時、次の幕にダメージ量減少3を付与",
          "onHit": [{ "op": "gain", "status": "damageDown", "amount": 3, "if": "crit", "when": "next" }]
        }
      ]
    },
    {
      "id": "ng-launch",
      "name": "発射",
      "attr": "pierce",
      "motion": "assets/units/Nagel/02-piercing-shot.png",
      "art": "assets/skills/LCB/Launch.png",
      "text": "使用時：呼吸4を得る",
      "onUse": { "gain": [{ "status": "breath", "amount": 4 }] },
      "dice": [
        {
          "type": "blunt",
          "roll": "2d7",
          "text": "クリティカル的中時、呼吸2を得る",
          "onHit": [{ "op": "gain", "status": "breath", "amount": 2, "self": true, "if": "crit" }]
        },
        {
          "type": "blunt",
          "roll": "2d7",
          "text": "クリティカル的中時、呼吸2を得る",
          "onHit": [{ "op": "gain", "status": "breath", "amount": 2, "self": true, "if": "crit" }]
        },
        {
          "type": "pierce",
          "roll": "2d10",
          "bullet": 1,
          "text": "銃撃。的中時、弾丸を1消費し振動4と破裂4を付与。クリティカル的中時、振動4と破裂4を付与",
          "onHit": [
            { "op": "gain", "status": "tremor", "amount": 4 },
            { "op": "gain", "status": "rupture", "amount": 4 },
            { "op": "gain", "status": "tremor", "amount": 4, "if": "crit" },
            { "op": "gain", "status": "rupture", "amount": 4, "if": "crit" }
          ]
        }
      ]
    }
  ],
  "defense": {
    "id": "ng-guard",
    "name": "防御",
    "attr": "block",
    "motion": "assets/units/Nagel/04-guard.png",
    "art": "assets/skills/LCB/Defense.png",
    "text": "",
    "dice": [
      { "type": "block", "roll": "8d2" }
    ]
  },
  "passives": [
    {
      "id": "ng-plan",
      "name": "作戦開始",
      "text": "効果：幕の終了時、呼吸が7以上あればSANを8回復",
      "hooks": [
        { "on": "sceneEnd", "op": "breathSan", "breath": 7, "amount": 8 }
      ]
    },
    {
      "id": "ng-resent",
      "name": "ルサンチマン",
      "text": "効果：自分より対象のHPの方が高いなら、自分が与えるダメージ量+3",
      "hooks": [
        { "on": "damage", "op": "higherHp", "amount": 3 }
      ]
    },
    {
      "id": "ng-suppress",
      "name": "制圧",
      "text": "効果：前の幕に守備スキルを使用したなら、戦術スキル威力+1",
      "hooks": [
        { "on": "power", "op": "guardedPower", "amount": 1 }
      ]
    }
  ]
}
);
