'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { DatabaseBackup, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const MIN_PASSPHRASE_LEN = 12;

export default function SystemPage() {
  const { client } = useAuth();
  const [passphrase, setPassphrase] = useState('');
  const [confirm, setConfirm] = useState('');
  const [includeAudit, setIncludeAudit] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const downloadBackup = async () => {
    setError('');
    setSuccess('');
    if (passphrase.length < MIN_PASSPHRASE_LEN) {
      setError(`Passphrase must be at least ${MIN_PASSPHRASE_LEN} characters`);
      return;
    }
    if (passphrase !== confirm) {
      setError('Passphrases do not match');
      return;
    }
    setDownloading(true);
    try {
      const data = await client.sys.backup(passphrase, { includeAudit });
      const blob = new Blob([data], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15);
      a.href = url;
      a.download = `vibr8vault-${stamp}.vvb`;
      a.click();
      URL.revokeObjectURL(url);
      setSuccess('Backup downloaded. Store it and the passphrase separately.');
      setPassphrase('');
      setConfirm('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Backup failed');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">System</h1>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DatabaseBackup className="size-5" />
            Backup
          </CardTitle>
          <CardDescription>
            Download a passphrase-encrypted snapshot (.vvb) of the entire
            vault. The same unseal shards work after restoring it into a
            fresh instance. Restores are done with the CLI:{' '}
            <code className="text-xs">vv backup restore &lt;file&gt;</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="backup-passphrase">Passphrase</Label>
            <Input
              id="backup-passphrase"
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder={`At least ${MIN_PASSPHRASE_LEN} characters`}
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="backup-confirm">Confirm passphrase</Label>
            <Input
              id="backup-confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              id="backup-audit"
              type="checkbox"
              checked={includeAudit}
              onChange={(e) => setIncludeAudit(e.target.checked)}
              className="size-4 accent-primary"
            />
            <Label htmlFor="backup-audit">Include audit log entries</Label>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {success && <p className="text-sm text-green-600">{success}</p>}

          <Button onClick={downloadBackup} disabled={downloading}>
            {downloading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            Download backup
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
