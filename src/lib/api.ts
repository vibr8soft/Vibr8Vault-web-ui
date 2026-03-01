import { Vibr8Vault } from '@vibr8vault/sdk';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8200';

export function createClient(token?: string): Vibr8Vault {
  return new Vibr8Vault({ address: API_URL, token });
}
