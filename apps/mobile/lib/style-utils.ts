/**
 * Lightweight style composition utility — the React Native equivalent
 * of `clsx + tailwind-merge` on the web.
 *
 * Accepts an arbitrary list of style objects, undefined values, nulls,
 * false booleans, or arrays of the same — and returns a single merged
 * style object / array suitable for passing to RN `style` props.
 */

import { StyleProp, StyleSheet } from 'react-native';

type StyleValue =
  | StyleProp<any>
  | undefined
  | null
  | false
  | StyleValue[];

export function cn(...inputs: StyleValue[]): StyleProp<any> {
  const flat: any[] = [];
  const walk = (value: StyleValue) => {
    if (value == null || value === false || value === true) return;
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    flat.push(value);
  };
  inputs.forEach(walk);
  return StyleSheet.flatten(flat);
}
