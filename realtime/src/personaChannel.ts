// PersonaChannel: なふだ（ペルソナ）1枚 = 1チャンネルの push 用 Durable Object。
// 「このなふだに起きた出来事」（QR接続成立など）を本人クライアントへ中継する。
// アドレス = idFromName(personaId)。中継挙動は BroadcastRoom に集約。
import { BroadcastRoom } from "./room";

export class PersonaChannel extends BroadcastRoom {}
