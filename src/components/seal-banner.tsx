'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';

export function SealBanner() {
  const { client } = useAuth();
  const [sealed, setSealed] = useState(false);

  useEffect(() => {
    const check = async () => {
      try {
        const status = await client.sys.status();
        setSealed(status.sealed);
      } catch {
        // ignore errors — vault may be unreachable
      }
    };
    check();
    const interval = setInterval(check, 5000);
    return () => clearInterval(interval);
  }, [client]);

  if (!sealed) return null;

  return (
    <div className="bg-destructive text-destructive-foreground px-4 py-2 text-center text-sm font-medium">
      Vault is sealed. Use the CLI to unseal: <code>ov unseal --key &lt;shard&gt;</code>
    </div>
  );
}
