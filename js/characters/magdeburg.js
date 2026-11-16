CHARACTER_DATA.push(
{
  "id": "magdeburg",
  "name": "マクデブルク",
  "team": "select",
  "portrait": "assets/units/magdeburg/portrait.png",
  "motions": {
    "move": "assets/units/magdeburg/01-move.png",
    "slash": "assets/units/magdeburg/02-slash.png",
    "pierce": "assets/units/magdeburg/03-pierce.png",
    "blunt": "assets/units/magdeburg/02-slash.png",
    "guard": "assets/units/magdeburg/05-guard.png",
    "hit": "assets/units/magdeburg/06-hit.png"
  },
  "head": "assets/units/magdeburg/head.png",
  "stateshead": "assets/units/magdeburg/stateshead.png",
  "office": "東部親指ソルダートII",
  "blurb": "",
  "hp": 125,
  "stagger": 50,
  "speed": "3d2",
  "bullets": 15,
  "resist": { "slash": "weak", "pierce": "endured", "blunt": "normal" },
  "attack": "slash",
  "keywords": ["火傷", "振動"],
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
      "id": "mb-bayonet",
      "name": "銃剣術【爆】",
      "attr": "slash",
      "text": "使用時：対象の振動と火傷の合計が15以上ならこのスキルの最後のダイスを破壊不能ダイスに変更",
      "onUse": { "unbreakableLast": 15 },
      "dice": [
        { "type": "slash", "roll": "2d4" },
        { "type": "slash", "roll": "2d6" },
        {
          "type": "pierce",
          "roll": "2d8",
          "text": "的中時、振動爆発。振動を3消費",
          "onHit": [
            { "op": "burst" },
            { "op": "spend", "status": "tremor", "amount": 3 }
          ]
        }
      ]
    },
    {
      "id": "mb-thumb",
      "name": "親指へ尊重を。",
      "attr": "pierce",
      "text": "使用時：対象の火傷と振動の合計7ごとにスキル威力+1（最大2）",
      "onUse": { "powerPer": 7, "powerMax": 2 },
      "dice": [
        {
          "type": "slash",
          "roll": "3d4",
          "text": "的中時、振動2を付与",
          "onHit": [{ "op": "gain", "status": "tremor", "amount": 2 }]
        },
        {
          "type": "pierce",
          "roll": "4d4",
          "text": "的中時、振動2を付与",
          "onHit": [{ "op": "gain", "status": "tremor", "amount": 2 }]
        }
      ]
    },
    {
      "id": "mb-scorch",
      "name": "灼熱突き",
      "attr": "pierce",
      "text": "使用時：対象の火傷と振動の合計7ごとにスキル威力+1（最大2）",
      "onUse": { "powerPer": 7, "powerMax": 2 },
      "dice": [
        {
          "type": "pierce",
          "roll": "5d3",
          "text": "的中時、火傷3を付与",
          "onHit": [{ "op": "gain", "status": "burn", "amount": 3 }]
        },
        {
          "type": "pierce",
          "roll": "2d10",
          "text": "的中時、火傷3を付与",
          "onHit": [{ "op": "gain", "status": "burn", "amount": 3 }]
        }
      ]
    },
    {
      "id": "mb-thrust",
      "name": "推力集中",
      "attr": "slash",
      "text": "使用時：対象の火傷と振動の合計7ごとにスキル威力+1（最大2）",
      "onUse": { "powerPer": 7, "powerMax": 2 },
      "dice": [
        {
          "type": "slash",
          "roll": "8d2",
          "bullet": 1,
          "text": "的中時、弾丸を1消費し振動3と火傷3を付与",
          "onHit": [
            { "op": "gain", "status": "tremor", "amount": 3 },
            { "op": "gain", "status": "burn", "amount": 3 }
          ]
        },
        {
          "type": "slash",
          "roll": "8d2",
          "bullet": 1,
          "text": "的中時、弾丸を1消費し振動爆発。対象の振動を1消費。対象の振動を振動-灼熱へと振幅変換",
          "onHit": [
            { "op": "burst" },
            { "op": "spend", "status": "tremor", "amount": 1 },
            { "op": "convert", "from": "tremor", "to": "tremorScorch" }
          ]
        }
      ]
    }
  ],
  "defense": {
    "id": "mb-guard",
    "name": "鉄の防御",
    "dice": [
      { "type": "block", "roll": "2d10" }
    ]
  },
  "passives": [
    {
      "id": "mb-discipline",
      "name": "規律執行",
      "text": "発動条件：スキル2を使用時\n常時効果：舞台開始時、自分の弾丸を灼熱推進弾へと弾倉変換\n効果：前の幕に敵を混乱させたなら、的中時、振動2を付与",
      "hooks": [
        { "on": "stage", "op": "magazine" },
        { "on": "hit", "skill": 2, "if": "staggeredLast", "op": "gain", "status": "tremor", "amount": 2 }
      ]
    },
    {
      "id": "mb-gambler",
      "name": "賭博師",
      "text": "効果：最大値的中時、ダメージ量増加1を得る",
      "hooks": [
        { "on": "maxHit", "op": "gain", "status": "damageUp", "amount": 1 }
      ]
    },
    {
      "id": "mb-strife",
      "name": "闘争-マクデブルク",
      "text": "効果：攻撃を受けた次の幕、スキル威力+2",
      "hooks": [
        { "on": "attacked", "op": "nextPower", "amount": 2 }
      ]
    }
  ]
}
);
