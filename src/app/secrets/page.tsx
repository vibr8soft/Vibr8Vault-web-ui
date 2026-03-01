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
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, FolderTree, KeyRound, ShieldCheck } from 'lucide-react';
import type { NamespaceResponse } from '@vibr8vault/sdk';

interface NamespaceCardData extends NamespaceResponse {
  secretCount?: number;
  policyCount?: number;
  statsLoading: boolean;
}

export default function SecretsPage() {
  const { client, isAdmin } = useAuth();
  const router = useRouter();

  const [namespaces, setNamespaces] = useState<NamespaceCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

      // Fetch stats for each namespace in parallel (non-blocking)
      nsList.forEach(async (ns, index) => {
        let secretCount: number | undefined;
        let policyCount: number | undefined;

        try {
          const secrets = await client.secrets.listNs(ns.name, '');
          secretCount = secrets.keys?.length ?? 0;
        } catch {
          // User may not have list permission on this namespace
        }

        if (isAdmin) {
          try {
            const policies = await client.policies.list(ns.name);
            policyCount = policies.policies?.length ?? 0;
          } catch {
            // Policies endpoint may fail
          }
        }

        setNamespaces((prev) =>
          prev.map((card, i) =>
            i === index
              ? { ...card, secretCount, policyCount, statsLoading: false }
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
  }, [client, isAdmin]);

  useEffect(() => {
    fetchNamespaces();
  }, [fetchNamespaces]);

  const handleCardClick = (namespace: string) => {
    router.push(`/secrets/${namespace}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Secrets</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Select a namespace to browse and manage its secrets.
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
                <div className="flex gap-4">
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-8 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : namespaces.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <FolderTree className="size-12 opacity-30 mb-3" />
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
                    <>
                      <Skeleton className="h-5 w-16" />
                      {isAdmin && <Skeleton className="h-5 w-16" />}
                    </>
                  ) : (
                    <>
                      {ns.secretCount !== undefined && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <KeyRound className="size-3.5" />
                          <span>{ns.secretCount} {ns.secretCount === 1 ? 'secret' : 'secrets'}</span>
                        </div>
                      )}
                      {ns.policyCount !== undefined && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <ShieldCheck className="size-3.5" />
                          <span>{ns.policyCount} {ns.policyCount === 1 ? 'policy' : 'policies'}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Created {new Date(ns.created_at).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
