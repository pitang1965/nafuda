import type { Locale } from "../types";
import type { DictionaryNode } from "../translate";
import en from "./en";
import ja from "./ja";

export const dictionaries: Record<Locale, DictionaryNode> = { en, ja };
