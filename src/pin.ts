// Simple deterrent hash for an optional PIN.
// Data is stored locally (AsyncStorage / localStorage) and the user can wipe
// it at any time, so we don't need a cryptographically strong scheme — just
// something that hides the digits at rest.
const SALT = '@cycle-tracker/pin/v1';

export const hashPin = (pin: string): string => {
  let h = 0;
  const s = `${SALT}:${pin}`;
  for (let i = 0; i < s.length; i += 1) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  // Mix in length so 1234 and 12340 hash to different things.
  return `${pin.length}.${(h >>> 0).toString(36)}`;
};

export const checkPin = (pin: string, hash: string): boolean =>
  hashPin(pin) === hash;
