'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { StatusResponse, HealthResponse } from '@vibr8vault/sdk';

export default function DashboardPage() {
  const { client } = useAuth();
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);

  useEffect(() => {
    client.sys.status().then(setStatus).catch(() => {});
    client.sys.health().then(setHealth).catch(() => {});
  }, [client]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Seal Status</CardTitle>
          </CardHeader>
          <CardContent>
            {status ? (
              <Badge variant={status.sealed ? 'destructive' : 'default'}>
                {status.sealed ? 'Sealed' : 'Unsealed'}
              </Badge>
            ) : (
              <span className="text-muted-foreground">Loading...</span>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Health</CardTitle>
          </CardHeader>
          <CardContent>
            {health ? (
              <Badge variant="default">{health.status}</Badge>
            ) : (
              <span className="text-muted-foreground">Loading...</span>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Initialized</CardTitle>
          </CardHeader>
          <CardContent>
            {status ? (
              <Badge variant={status.initialized ? 'default' : 'secondary'}>
                {status.initialized ? 'Yes' : 'No'}
              </Badge>
            ) : (
              <span className="text-muted-foreground">Loading...</span>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/secrets">
          <Card className="hover:bg-accent transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle>Secrets</CardTitle>
              <CardDescription>Browse and manage secrets</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/tokens">
          <Card className="hover:bg-accent transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle>Tokens</CardTitle>
              <CardDescription>Create and revoke tokens</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/users">
          <Card className="hover:bg-accent transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle>Users</CardTitle>
              <CardDescription>Manage user accounts</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}
