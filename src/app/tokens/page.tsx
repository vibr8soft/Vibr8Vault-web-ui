'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import {
  Plus,
  RefreshCw,
  Trash2,
  Copy,
  Check,
  Coins,
  Info,
  Terminal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { TokenListItem } from '@vibr8vault/sdk';

function UserTokenView({ token }: { token: string | null }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may fail in some contexts
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Token</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Use this token to authenticate API requests from your tools.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Session Token</CardTitle>
          <CardDescription>
            Copy this token and paste it into your API client (e.g. Bruno, curl, SDK).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Input
              value={token ?? ''}
              readOnly
              className="font-mono text-sm"
            />
            <Button variant="outline" size="icon" onClick={handleCopy} title="Copy to clipboard">
              {copied ? <Check className="size-4 text-green-600" /> : <Copy className="size-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            This is your current session token. It expires when your session ends.
          </p>
        </CardContent>
      </Card>

      {token && (
        <div className="rounded-lg border bg-muted/30 px-4 py-3">
          <div className="flex items-start gap-2">
            <Info className="size-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="space-y-2 min-w-0">
              <p className="text-sm text-muted-foreground">
                Configure the <span className="font-mono">vv</span> CLI to use this token:
              </p>
              <div className="flex items-center gap-2 min-w-0">
                <Terminal className="size-3.5 text-muted-foreground shrink-0" />
                <code className="text-xs font-mono bg-muted rounded px-1.5 py-0.5 truncate">
                  vv config set-token {token}
                </code>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={async () => {
                    try {
                      const text = `vv config set-token ${token}`;
                      if (navigator.clipboard) {
                        await navigator.clipboard.writeText(text);
                      } else {
                        const textarea = document.createElement('textarea');
                        textarea.value = text;
                        textarea.style.position = 'fixed';
                        textarea.style.opacity = '0';
                        document.body.appendChild(textarea);
                        textarea.select();
                        document.execCommand('copy');
                        document.body.removeChild(textarea);
                      }
                    } catch {
                      // Clipboard write failed
                    }
                  }}
                  title="Copy to clipboard"
                >
                  <Copy className="size-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TokensPage() {
  const { client, isAdmin, token: sessionToken } = useAuth();

  // Token list state
  const [tokens, setTokens] = useState<TokenListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Create dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [createType, setCreateType] = useState('service');
  const [createTTL, setCreateTTL] = useState('');
  const [createPolicies, setCreatePolicies] = useState('');
  const [createMaxUses, setCreateMaxUses] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Created token display state (shown once after creation)
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Revoke dialog state
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [revoking, setRevoking] = useState(false);

  // Fetch all tokens
  const fetchTokens = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await client.tokens.list();
      setTokens(resp.tokens || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tokens');
      setTokens([]);
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  // Create a new token
  const handleCreate = async () => {
    setCreating(true);
    setCreateError('');
    try {
      const opts: {
        type: string;
        ttl?: string;
        policies?: string[];
        max_uses?: number;
      } = { type: createType };

      if (createTTL.trim()) {
        opts.ttl = createTTL.trim();
      }

      const policiesArray = createPolicies
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean);
      if (policiesArray.length > 0) {
        opts.policies = policiesArray;
      }

      if (createMaxUses.trim()) {
        const maxUses = parseInt(createMaxUses.trim(), 10);
        if (isNaN(maxUses) || maxUses < 0) {
          setCreateError('Max uses must be a non-negative number');
          setCreating(false);
          return;
        }
        opts.max_uses = maxUses;
      }

      const resp = await client.tokens.create(opts);
      setCreatedToken(resp.token);
      setCopied(false);
      fetchTokens();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create token');
    } finally {
      setCreating(false);
    }
  };

  // Copy created token to clipboard
  const handleCopy = async () => {
    if (!createdToken) return;
    try {
      await navigator.clipboard.writeText(createdToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select the text in the input
    }
  };

  // Close create dialog and reset state
  const closeCreateDialog = () => {
    setCreateOpen(false);
    setCreateType('service');
    setCreateTTL('');
    setCreatePolicies('');
    setCreateMaxUses('');
    setCreateError('');
    setCreatedToken(null);
    setCopied(false);
  };

  // Revoke a token
  const handleRevoke = async () => {
    if (!revokeId) return;
    setRevoking(true);
    try {
      await client.tokens.revoke(revokeId);
      setRevokeId(null);
      fetchTokens();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke token');
    } finally {
      setRevoking(false);
    }
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    // Check for zero time (Go zero value)
    if (date.getFullYear() === 1) return 'Never';
    return date.toLocaleString();
  };

  // Token type badge color
  const typeBadgeVariant = (type: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (type) {
      case 'root':
        return 'destructive';
      case 'operator':
        return 'default';
      case 'ephemeral':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  if (!isAdmin) {
    return <UserTokenView token={sessionToken} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Tokens</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchTokens} disabled={loading}>
            <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Create Token
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 text-destructive px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Policies</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Loading tokens...
                </TableCell>
              </TableRow>
            ) : tokens.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  <div className="flex flex-col items-center gap-2">
                    <Coins className="size-10 opacity-30" />
                    <p>No tokens found.</p>
                    <p className="text-xs">Create a token using the button above.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              tokens.map((tok) => (
                <TableRow key={tok.id}>
                  <TableCell className="font-mono text-xs max-w-[200px] truncate" title={tok.id}>
                    {tok.id}
                  </TableCell>
                  <TableCell>
                    <Badge variant={typeBadgeVariant(tok.type)}>{tok.type}</Badge>
                  </TableCell>
                  <TableCell>
                    {tok.policies && tok.policies.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {tok.policies.map((p) => (
                          <Badge key={p} variant="outline" className="text-xs">
                            {p}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">none</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{formatDate(tok.expires_at)}</TableCell>
                  <TableCell className="text-sm">{formatDate(tok.created_at)}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => setRevokeId(tok.id)}
                      title="Revoke token"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create Token Dialog */}
      <Dialog open={createOpen} onOpenChange={(open) => { if (!open) closeCreateDialog(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{createdToken ? 'Token Created' : 'Create Token'}</DialogTitle>
            <DialogDescription>
              {createdToken
                ? 'Copy the token below. It will not be shown again.'
                : 'Configure the new token settings.'}
            </DialogDescription>
          </DialogHeader>

          {createdToken ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Input
                  value={createdToken}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button variant="outline" size="icon" onClick={handleCopy} title="Copy to clipboard">
                  {copied ? <Check className="size-4 text-green-600" /> : <Copy className="size-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Store this token securely. You will not be able to see it again after closing this dialog.
              </p>
              <DialogFooter>
                <Button onClick={closeCreateDialog}>Done</Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              {createError && (
                <div className="rounded-md bg-destructive/10 text-destructive px-3 py-2 text-sm">
                  {createError}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="token-type">Type</Label>
                <select
                  id="token-type"
                  value={createType}
                  onChange={(e) => setCreateType(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="service">Service</option>
                  <option value="ephemeral">Ephemeral</option>
                  <option value="operator">Operator</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="token-ttl">TTL (e.g. 24h, 720h, 30m)</Label>
                <Input
                  id="token-ttl"
                  value={createTTL}
                  onChange={(e) => setCreateTTL(e.target.value)}
                  placeholder="Leave empty for no expiration"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="token-policies">Policies (comma-separated)</Label>
                <Input
                  id="token-policies"
                  value={createPolicies}
                  onChange={(e) => setCreatePolicies(e.target.value)}
                  placeholder="e.g. read-only, backend-prod"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="token-max-uses">Max Uses (0 = unlimited)</Label>
                <Input
                  id="token-max-uses"
                  type="number"
                  min="0"
                  value={createMaxUses}
                  onChange={(e) => setCreateMaxUses(e.target.value)}
                  placeholder="0"
                />
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={closeCreateDialog} disabled={creating}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={creating}>
                  {creating ? 'Creating...' : 'Create'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Revoke Confirmation Dialog */}
      <Dialog open={!!revokeId} onOpenChange={(open) => { if (!open) setRevokeId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke Token</DialogTitle>
            <DialogDescription>
              Are you sure you want to revoke the token with ID{' '}
              <span className="font-mono font-semibold">{revokeId}</span>?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeId(null)} disabled={revoking}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRevoke} disabled={revoking}>
              {revoking ? 'Revoking...' : 'Revoke'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
