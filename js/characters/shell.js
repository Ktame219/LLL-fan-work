CHARACTER_DATA.push(
{
  "id": "shell",
  "name": "鉄殻",
  "team": "select",
  "portrait": "assets/units/shell/portrait.png",
  "motions": {
    "move": "assets/units/shell/01-move.png",
    "slash": "assets/units/shell/02-mace-swing.png",
    "pierce": "assets/units/shell/03-mace-thrust.png",
    "blunt": "assets/units/shell/02-mace-swing.png",
    "guard": "assets/units/shell/04-arm-guard.png",
    "hit": "assets/units/shell/05-hit-knockback.png"
  },
  "head": "assets/units/shell/head.png",
  "stateshead": "assets/units/shell/stateshead.png",
  "office": "鉄の殻",
  "blurb": "打撃が脆弱で、斬撃が耐性。防御が厚く、速度は遅め。",
  "hp": 54,
  "stagger": 34,
  "speedMin": 1,
  "speedMax": 4,
  "resist": { "slash": "endured", "pierce": "normal", "blunt": "fatal" },
  "attack": "blunt",
  "keywords": ["振動"],
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
    { "id": "smow", "name": "薙ぎ", "icon": "kiri", "dice": [
      { "type": "slash", "min": 2, "max": 6 },
      { "type": "slash", "min": 2, "max": 4 }
    ]},
    { "id": "ssting", "name": "刺し込み", "icon": "ehari", "dice": [
      { "type": "pierce", "min": 3, "max": 6 },
      { "type": "pierce", "min": 2, "max": 5 }
    ]},
    { "id": "sheavy", "name": "重い殻", "dice": [
      { "type": "blunt", "min": 4, "max": 8 },
      { "type": "block", "min": 3, "max": 6 }
    ]},
    { "id": "spierce", "name": "貫き", "dice": [
      { "type": "pierce", "min": 4, "max": 8 },
      { "type": "pierce", "min": 3, "max": 5 }
    ]}
  ],
  "defense": { "id": "swall", "name": "鉄壁", "dice": [
    { "type": "block", "min": 3, "max": 8 },
    { "type": "block", "min": 2, "max": 6 }
  ]}
}
);
