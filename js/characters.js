/* キャラは js/characters/ に1人1ファイル。中身は JSON。
   足すときはファイルを作り、戦闘.html と 編成.html の script に同じ順で足す。
   画像は assets/units/キャラid/ に置く。
     portrait.png     立ち絵
   motions は行動中の立ち絵。無いキャラは portrait のまま。
     "move" 移動  "slash" 斬撃  "pierce" 貫通  "blunt" 打撃
     "guard" 防御  "hit" 被弾
   次の幕が始まるまで、最後の行動の絵が残る。
     head.png         速度ダイス下の頭
     stateshead.png  状態欄の頭
   team
     "player"  編成に出せる
     "select"  編成に出せる
     "off"     編成に出ない
   誰を味方にするかは編成画面で決める。選ばなかった人は、戦闘前に相手として選べる。
   速度はどちらか。
     "speedMin" と "speedMax"   その範囲から均等に1つ
     "speed": "3d2"             2面ダイスを3つ振り、出目の合計
   "bullets" は弾丸の初期数。無いキャラは書かなくてよい。戦闘中は状態欄に弾丸として出る。
   attack は主に使う攻撃タイプ。 "slash" 斬撃 / "pierce" 貫通 / "blunt" 打撃 のどれか1つ。未定なら書かない。
   keywords は絞り込み用の配列。次の語だけが使える。空配列 [] でもよい。
     "火傷" "出血" "振動" "破裂" "沈潜" "呼吸" "充電"
   attacks は戦術スキル4つ。defense は通常の防御スキル1つ。matchable が true ならマッチ可能防御スキル。attacks の中にも書ける。未定なら attacks は []、defense は null。
   ダイスの出目は "roll": "2d4" のように書く。2個の4面ダイスを足した値になる。
   "onUse" はスキルを使い始めたときの条件。"onHit" はダイスが的中したときの効果。
     { "op": "burst" }                         振動爆発
     { "op": "ruptureBurst" }                  破裂爆発
     { "op": "spend", "status": "tremor", "amount": 3 }  その数だけ消費
     { "op": "gain", "status": "burn", "amount": 3 }     その数だけ付与
     { "op": "convert", "from": "tremor", "to": "tremorScorch" }  振幅変換
   "bullet": 1 はそのダイスで攻撃するとき弾丸を1消費する。弾丸が足りなければ、その攻撃はキャンセルされる。マッチの勝ち負けには影響しない。
   "unbreakableLast": 15 は、対象の火傷と振動の合計が15以上なら最後のダイスを破壊不能にする。
   破壊不能はマッチに負けても消えず、次のダイスとマッチする。双方の処理が終わったあと、残った破壊不能ダイスで攻撃する。
   "powerPer": 7 と "powerMax": 2 は、合計7ごとにスキル威力+1、最大2。
   "breathAtLeast": 7 と "power": 1 は、自分の呼吸がその数以上ならスキル威力+その数。一方攻撃でも付く。
   "sinkingAtLeast": 6 と "power": 2 は、マッチのとき対象の沈潜がその数以上ならマッチ威力+その数。
   "sinkingPer": 3 と "powerMax": 3 は、マッチのとき対象の沈潜がその数ごとにスキル威力+1、最大 powerMax。
   "gain" はスキルを使い始めたとき、自分に付与する。"when": "next" で次の幕、"party": true で生きている味方全員（自分を含む）。
   "unbreakable": true はそのダイスを常に破壊不能にする。
   "onWin": [{ "op": "nextDiePower", "amount": 6 }] は、そのダイスがマッチに勝ったとき、同じスキルの次のダイス威力+その数。
   "onHit" の { "op": "maxDown", "amount": 3 } は、相手が次に振るダイスの最大値をその数下げる。幕をまたがない。
   "cleanse": { "breath": 10, "spend": 5 } は、呼吸がその数以上で自分にデバフがあるとき、デバフを1つ消し呼吸を消費する。
   "critBonus": 3 は、そのダイスがクリティカルしたときダメージをさらにその数増やす。
   "onEvade": [{ "op": "healSan", "amount": 5 }] は回避が攻撃に勝ったとき、SANを戻す。
   "onHit" の { "op": "healSanDealt", "if": "crit" } は、クリティカルで的中したとき与えたダメージだけSANを戻す。
   "onHit" の gain に "self": true を付けると、付与先は対象ではなく自分。
   "if": "crit" は、そのダイスがクリティカルしたときだけ。
   "when": "next" は、今の幕では付かず、次の幕の開始時に付く。
   "motion" はそのスキルを出しているときの立ち絵。"art" はスキル欄の絵。無いときは assets/skills/スキルid.png。
   passives はパッシブの配列。無いキャラは書かなくてよい。名前と説明だけでも表示できる。
   動かすときは hooks に、いつ・何をするかを書く。
     "on": "stage"     舞台開始時（最初の幕の直前、一度だけ）
     "on": "hit"       ダイスが的中したとき
     "on": "maxHit"    ダイスの出目が最大値で的中したとき
     "on": "attacked"  相手の攻撃ダイスを受けたとき
     "skill": 2        戦術スキルの2番目を使ったときだけ。防御スキルは 0
     "if": "staggeredLast"  前の幕に、自分が敵を混乱させていたときだけ
     { "op": "magazine" }                                  弾倉変換。弾丸を全て弾丸-灼熱推進弾に置き換える。数は変わらず、弾丸として消費される
     { "op": "gain", "status": "tremor", "amount": 2 }     的中時は対象へ、最大値的中時は自分へ付与
     { "op": "nextPower", "amount": 2 }                    攻撃を受けた次の幕、スキル威力+その数
     { "op": "partySan", "min": 1, "max": 5, "san": 30, "breath": 5 }
                                                           戦闘開始時、味方の混乱抵抗をその範囲で戻し、自分の混乱抵抗が san 以上なら呼吸
     { "op": "fastestPower", "amount": 1 }                自分の速度が他の全員より高いとき、スキル威力+その数
     { "op": "heal", "amount": 5 }                         マッチに勝ったとき体力を戻す。on は clashWin
     { "op": "breathSan", "breath": 7, "amount": 8 }       幕の終了時、呼吸がその数以上ならSANを戻す。on は sceneEnd
     { "op": "higherHp", "amount": 3 }                     対象の体力が自分より高いとき、与えるダメージ+その数。on は damage
     { "op": "guardedPower", "amount": 1 }                 前の幕に守備スキルを使っていたなら、戦術スキル威力+その数。on は power
     { "op": "evadePower", "speed": 3, "amount": 3 }       速度がその数以上なら、回避ダイス威力+その数。on は power
     { "op": "typeDamage", "type": "slash", "amount": 6 }  その攻撃タイプのダメージ+その数。on は damage
     gain に "self": true で自分へ、"when": "next" で次の幕に付く。
   精神力の効果は low / onBreak / onRecover。空配列 [] は何もしない。
     { "status": "bind", "amount": 3 }         束縛
     { "status": "disarm", "amount": 2 }       武装解除
     { "status": "feeble", "amount": 3 }       虚弱
     { "status": "fragile", "amount": 5 }      脆弱
     { "status": "burn", "amount": 3 }         火傷
     { "status": "tremor", "amount": 3 }       振動
     { "status": "tremorScorch", "amount": 3 } 振動-灼熱
     { "status": "scorchAmmo", "amount": 1 }   弾丸-灼熱推進弾
     { "status": "breath", "amount": 1 }       呼吸
     { "status": "sinking", "amount": 1 }      沈潜
     { "status": "rupture", "amount": 1 }      破裂
     { "status": "damageDown", "amount": 3 }   ダメージ量減少
     { "status": "staggerFragile", "amount": 2 } 混乱脆弱
     { "status": "power", "amount": 1 }        パワー
     { "status": "protect", "amount": 1 }      保護
   ダメージ量減少・混乱脆弱・パワー・保護は、次の幕の開始時に消える。
   ダイスに "bullet": 1 と書くと、そのダイスがダメージを通したとき弾丸を1消費する。
   "tremorBurst": true と書くと、そのダイスがダメージを通したとき相手に振動爆発が起きる。
   "ruptureBurst": true と書くと、そのダイスがダメージを通したとき相手に破裂爆発が起きる。
   効果の説明は data.js の STATUS_INFO に書いてある。
   low は精神力が最大の25%以下で幕が始まったとき。
   onBreak は混乱したとき。onRecover は混乱から戻ったとき。
   lowText と breakText は画面に出す説明文。
   "breakResist": "weak" は混乱中の耐性。書かなければ全て脆弱（fatal）。
   抵抗の倍率は fatal 脆弱×2 / weak 弱点×1.5 / normal 普通×1 / endured 抵抗×0.5 / immune 無効×0。
*/
var CHARACTER_DATA = [];
