CHARACTER_DATA.push(
{
  "id": "echo",
  "name": "残響",
  "team": "select",
  "portrait": "assets/units/echo/portrait.png",
  "motions": {
    "move": "assets/units/echo/01-dash.png",
    "slash": "assets/units/echo/02-downward-swing.png",
    "pierce": "assets/units/echo/03-thrust.png",
    "blunt": "assets/units/echo/04-punch.png",
    "guard": "assets/units/echo/05-spear-guard.png",
    "hit": "assets/units/echo/06-hit-knockback.png"
  },
  "head": "assets/units/echo/head.png",
  "stateshead": "assets/units/echo/stateshead.png",
  "office": "残る刃",
  "blurb": "斬撃が脆弱。切り払いや連切りが通りやすい。",
  "hp": 40,
  "stagger": 26,
  "speedMin": 1,
  "speedMax": 5,
  "resist": { "slash": "fatal", "pierce": "endured", "blunt": "normal" },
  "attack": "pierce",
  "keywords": ["出血"],
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
    { "id": "efurui", "name": "横薙ぎ", "icon": "kiri", "dice": [
      { "type": "slash", "min": 2, "max": 6 },
      { "type": "slash", "min": 2, "max": 4 }
    ]},
    { "id": "ehari", "name": "針", "dice": [
      { "type": "pierce", "min": 3, "max": 7 },
      { "type": "pierce", "min": 2, "max": 4 }
    ]},
    { "id": "ekobushi", "name": "拳", "dice": [
      { "type": "blunt", "min": 3, "max": 6 },
      { "type": "blunt", "min": 2, "max": 5 }
    ]},
    { "id": "efuta", "name": "二突き", "dice": [
      { "type": "pierce", "min": 2, "max": 5 },
      { "type": "pierce", "min": 2, "max": 5 },
      { "type": "pierce", "min": 1, "max": 4 }
    ]}
  ],
  "defense": { "id": "emigamae", "name": "半身", "dice": [
    { "type": "block", "min": 2, "max": 6 },
    { "type": "slash", "min": 1, "max": 4 }
  ]}
}
);
