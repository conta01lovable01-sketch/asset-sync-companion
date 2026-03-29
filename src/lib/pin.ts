const PIN_KEY = 'ssa_pin_hash';

async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + 'ssa_salt_2024');
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function setPin(pin: string): Promise<void> {
  const hash = await hashPin(pin);
  localStorage.setItem(PIN_KEY, hash);
}

export async function verifyPin(pin: string): Promise<boolean> {
  const stored = localStorage.getItem(PIN_KEY);
  if (!stored) return true; // no pin set yet
  const hash = await hashPin(pin);
  return hash === stored;
}

export function isPinSet(): boolean {
  return !!localStorage.getItem(PIN_KEY);
}

export function removePin(): void {
  localStorage.removeItem(PIN_KEY);
}
