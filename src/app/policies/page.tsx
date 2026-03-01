'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  RefreshCw,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Plus,
} from 'lucide-react';
import type { NamespaceResponse } from '@vibr8vault/sdk';

interface NamespaceCardData extends NamespaceResponse {
  policyCount?: number;
  statsLoading: boolean;
}

const ALL_CAPABILITIES = ['read', 'list', 'write', 'delete', 'sudo'] as const;

export default function PoliciesPage() {
  const { client } = useAuth();
  const router = useRouter();

  const [namespaces, setNamespaces] = useState<NamespaceCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Quick builder state
  const [builderOpen, setBuilderOpen] = useState(false);
  const [builderName, setBuilderName] = useState('');
  const [builderNs, setBuilderNs] = useState('default');
  const [builderPath, setBuilderPath] = useState('');
  const [builderCaps, setBuilderCaps] = useState<Set<string>>(new Set());
  const [builderSaving, setBuilderSaving] = useState(false);
  const [builderError, setBuilderError] = useState('');
  const [builderSuccess, setBuilderSuccess] = useState('');

  const fetchNamespaces = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await client.namespaces.list();
      const nsList = resp.namespaces || [];
      const cards: NamespaceCardData[] = nsList.map((ns) => ({
        ...ns,
        statsLoading: true,
      }));
      setNamespaces(cards);

      // Fetch policy counts in parallel
      nsList.forEach(async (ns, index) => {
        let policyCount: number | undefined;
        try {
          const policies = await client.policies.list(ns.name);
          policyCount = policies.policies?.length ?? 0;
        } catch {
          // May not have permission
        }

        setNamespaces((prev) =>
          prev.map((card, i) =>
            i === index
              ? { ...card, policyCount, statsLoading: false }
              : card
          )
        );
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load namespaces');
      setNamespaces([]);
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    fetchNamespaces();
  }, [fetchNamespaces]);

  const handleCardClick = (namespace: string) => {
    router.push(`/policies/${namespace}`);
  };

  const toggleCap = (cap: string) => {
    setBuilderCaps((prev) => {
      const next = new Set(prev);
      if (next.has(cap)) next.delete(cap);
      else next.add(cap);
      return next;
    });
  };

  const handleBuilderCreate = async () => {
    setBuilderError('');
    setBuilderSuccess('');

    if (!builderName.trim()) {
      setBuilderError('Policy name is required.');
      return;
    }
    if (!builderPath.trim()) {
      setBuilderError('Path pattern is required.');
      return;
    }
    if (builderCaps.size === 0) {
      setBuilderError('Select at least one capability.');
      return;
    }

    const capsArray = Array.from(builderCaps);
    const yaml = `name: ${builderName.trim()}\nrules:\n  - path: "${builderPath.trim()}"\n    capabilities: [${capsArray.join(', ')}]\n`;

    setBuilderSaving(true);
    try {
      const data = await client.policies.create(yaml, builderNs);
      setBuilderSuccess(`Policy "${data.name}" created in namespace "${builderNs}".`);
      setBuilderName('');
      setBuilderPath('');
      setBuilderCaps(new Set());
      await fetchNamespaces();
    } catch (err) {
      setBuilderError(err instanceof Error ? err.message : 'Failed to create policy');
    } finally {
      setBuilderSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Policies</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Select a namespace to manage its policies.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchNamespaces} disabled={loading}>
          <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Namespace cards grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="py-4">
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-20 mt-1" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : namespaces.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <ShieldCheck className="size-12 opacity-30 mb-3" />
          <p className="text-sm">No namespaces available</p>
          <p className="text-xs">Contact an administrator to get access to a namespace.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {namespaces.map((ns) => (
            <Card
              key={ns.name}
              className="py-4 cursor-pointer transition-colors hover:bg-accent/50 hover:border-accent-foreground/20"
              onClick={() => handleCardClick(ns.name)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-mono">{ns.name}</CardTitle>
                  <Badge variant={ns.type === 'default' ? 'default' : ns.type === 'private' ? 'outline' : 'secondary'}>
                    {ns.type}
                  </Badge>
                </div>
                {ns.owner && (
                  <CardDescription>Owner: {ns.owner}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm">
                  {ns.statsLoading ? (
                    <Skeleton className="h-5 w-16" />
                  ) : ns.policyCount !== undefined ? (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <ShieldCheck className="size-3.5" />
                      <span>{ns.policyCount} {ns.policyCount === 1 ? 'policy' : 'policies'}</span>
                    </div>
                  ) : null}
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Created {new Date(ns.created_at).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Quick Policy Builder */}
      <div className="border rounded-lg overflow-hidden">
        <button
          type="button"
          className="w-full flex items-center justify-between px-4 py-3 bg-muted/50 hover:bg-muted/70 transition-colors text-left"
          onClick={() => setBuilderOpen(!builderOpen)}
        >
          <div className="flex items-center gap-2">
            <Plus className="size-4" />
            <span className="font-semibold text-sm">Quick Policy Builder</span>
          </div>
          {builderOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </button>

        {builderOpen && (
          <div className="p-4 space-y-4 border-t">
            <p className="text-sm text-muted-foreground">
              Create a simple single-rule policy without writing YAML.
            </p>

            {builderError && (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {builderError}
              </div>
            )}
            {builderSuccess && (
              <div className="rounded-md border border-green-500/50 bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-400">
                {builderSuccess}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="builder-name">Policy Name</Label>
                <Input
                  id="builder-name"
                  value={builderName}
                  onChange={(e) => setBuilderName(e.target.value)}
                  placeholder="e.g. backend-read-only"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="builder-ns">Namespace</Label>
                <select
                  id="builder-ns"
                  value={builderNs}
                  onChange={(e) => setBuilderNs(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                >
                  {namespaces.map((ns) => (
                    <option key={ns.name} value={ns.name}>{ns.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="builder-path">Path Pattern</Label>
                <Input
                  id="builder-path"
                  value={builderPath}
                  onChange={(e) => setBuilderPath(e.target.value)}
                  placeholder="e.g. apps/backend/*"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Capabilities</Label>
              <div className="flex flex-wrap gap-3">
                {ALL_CAPABILITIES.map((cap) => (
                  <label key={cap} className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={builderCaps.has(cap)}
                      onChange={() => toggleCap(cap)}
                      className="rounded border-input"
                    />
                    {cap}
                  </label>
                ))}
              </div>
            </div>

            <Button onClick={handleBuilderCreate} disabled={builderSaving}>
              <Plus className="size-4" />
              {builderSaving ? 'Creating...' : 'Create Policy'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
