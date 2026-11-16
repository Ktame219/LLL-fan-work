CHARACTER_DATA.push(
{
  "id": "keeper",
  "name": "灯番",
  "team": "player",
  "portrait": "assets/units/keeper/portrait.png",
  "motions": {
    "move": "assets/units/keeper/01-move.png",
    "slash": "assets/units/keeper/02-downward-slash.png",
    "pierce": "assets/units/keeper/03-thrust.png",
    "blunt": "assets/units/keeper/04-punch.png",
    "guard": "assets/units/keeper/05-guard.png",
    "hit": "assets/units/keeper/06-hit-backstep-in-motion.png"
  },
  "head": "assets/units/keeper/head.png",
  "stateshead": "assets/units/keeper/stateshead.png",
  "office": "灯の番",
  "blurb": "操作する側。貫通が弱点で、打撃が耐性。",
  "hp": 46,
  "stagger": 30,
  "speedMin": 2,
  "speedMax": 6,
  "resist": { "slash": "normal", "pierce": "weak", "blunt": "endured" },
  "attack": "slash",
  "keywords": ["呼吸"],
  "mind": {
    "name": "パニック",
    "icon": "assets/mental_pattern_icons/panic.png",
    "lowText": "なし",
    "breakText": "行動不能。全ての耐性が脆弱になる",
    "low": [],
    "onBreak": [],
    "onRecover": []
  },
  "attacks": [
    { "id": "kiri", "name": "切り払い", "dice": [
      { "type": "slash", "min": 2, "max": 6 },
      { "type": "slash", "min": 2, "max": 4 }
    ]},
    { "id": "tsuki", "name": "突き込み", "dice": [
      { "type": "pierce", "min": 2, "max": 6 },
      { "type": "pierce", "min": 2, "max": 4 }
    ]},
    { "id": "uchi", "name": "打ち据え", "dice": [
      { "type": "blunt", "min": 3, "max": 7 },
      { "type": "blunt", "min": 2, "max": 5 }
    ]},
    { "id": "ren", "name": "連切り", "dice": [
      { "type": "slash", "min": 2, "max": 5 },
      { "type": "slash", "min": 2, "max": 4 },
      { "type": "slash", "min": 1, "max": 4 }
    ]}
  ],
  "defense": { "id": "uke", "name": "受け身", "dice": [
    { "type": "block", "min": 3, "max": 7 },
    { "type": "slash", "min": 1, "max": 4 }
  ]}
}
);
