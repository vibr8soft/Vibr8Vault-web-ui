'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { AuditEntry, AuditQueryOpts, AuditListResponse } from '@vibr8vault/sdk';

const PAGE_SIZE = 50;

const severityColor: Record<string, string> = {
  debug: 'bg-gray-100 text-gray-800 border-gray-300',
  info: 'bg-blue-100 text-blue-800 border-blue-300',
  warn: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  warning: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  critical: 'bg-red-100 text-red-800 border-red-300',
};

const resultColor: Record<string, string> = {
  ok: 'bg-green-100 text-green-800 border-green-300',
  denied: 'bg-orange-100 text-orange-800 border-orange-300',
  error: 'bg-red-100 text-red-800 border-red-300',
};

export default function AuditPage() {
  const { client } = useAuth();

  // Data state
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filter state
  const [action, setAction] = useState('');
  const [username, setUsername] = useState('');
  const [namespace, setNamespace] = useState('');
  const [severity, setSeverity] = useState('');
  const [resourceType, setResourceType] = useState('');
  const [result, setResult] = useState('');

  const fetchEntries = useCallback(async (currentOffset: number) => {
    setLoading(true);
    setError('');
    try {
      const opts: AuditQueryOpts = {
        limit: PAGE_SIZE,
        offset: currentOffset,
      };
      if (action.trim()) opts.action = action.trim();
      if (username.trim()) opts.username = username.trim();
      if (namespace.trim()) opts.namespace = namespace.trim();
      if (severity) opts.severity = severity;
      if (resourceType) opts.type = resourceType;
      if (result) opts.result = result;

      const resp: AuditListResponse = await client.audit.list(opts);
      setEntries(resp.entries || []);
      setTotal(resp.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit entries');
      setEntries([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [client, action, username, namespace, severity, resourceType, result]);

  useEffect(() => {
    fetchEntries(offset);
  }, [fetchEntries, offset]);

  const handleSearch = () => {
    setOffset(0);
    fetchEntries(0);
  };

  const handleClear = () => {
    setAction('');
    setUsername('');
    setNamespace('');
    setSeverity('');
    setResourceType('');
    setResult('');
    setOffset(0);
  };

  const handlePrevious = () => {
    const newOffset = Math.max(0, offset - PAGE_SIZE);
    setOffset(newOffset);
  };

  const handleNext = () => {
    const newOffset = offset + PAGE_SIZE;
    if (newOffset < total) {
      setOffset(newOffset);
    }
  };

  const formatActor = (entry: AuditEntry): string => {
    if (entry.actor?.username) return entry.actor.username;
    if (entry.actor?.token_id) return entry.actor.token_id.substring(0, 8);
    return '-';
  };

  const showFrom = total > 0 ? offset + 1 : 0;
  const showTo = Math.min(offset + PAGE_SIZE, total);

  const selectClass = 'flex h-10 w-full rounded-md border px-3 py-2 text-sm';

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Audit Log</h1>

      {/* Error banner */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            <div className="space-y-2">
              <Label htmlFor="filter-action">Action</Label>
              <Input
                id="filter-action"
                value={action}
                onChange={(e) => setAction(e.target.value)}
                placeholder="e.g. secret.read"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="filter-username">Username</Label>
              <Input
                id="filter-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. alice"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="filter-namespace">Namespace</Label>
              <Input
                id="filter-namespace"
                value={namespace}
                onChange={(e) => setNamespace(e.target.value)}
                placeholder="e.g. default"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="filter-severity">Severity</Label>
              <select
                id="filter-severity"
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className={selectClass}
              >
                <option value="">All</option>
                <option value="debug">Debug</option>
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filter-type">Resource Type</Label>
              <select
                id="filter-type"
                value={resourceType}
                onChange={(e) => setResourceType(e.target.value)}
                className={selectClass}
              >
                <option value="">All</option>
                <option value="secret">Secret</option>
                <option value="policy">Policy</option>
                <option value="namespace">Namespace</option>
                <option value="user">User</option>
                <option value="token">Token</option>
                <option value="system">System</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filter-result">Result</Label>
              <select
                id="filter-result"
                value={result}
                onChange={(e) => setResult(e.target.value)}
                className={selectClass}
              >
                <option value="">All</option>
                <option value="ok">OK</option>
                <option value="denied">Denied</option>
                <option value="error">Error</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4">
            <Button size="sm" onClick={handleSearch}>
              Search
            </Button>
            <Button size="sm" variant="outline" onClick={handleClear}>
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle>
            {loading ? 'Loading...' : `${total} entries`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Namespace</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Detail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-36" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    </TableRow>
                  ))
                ) : entries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12">
                      <p className="text-sm text-muted-foreground">No audit entries found.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  entries.map((entry, idx) => (
                    <TableRow key={`${entry.timestamp}-${idx}`}>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {new Date(entry.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {entry.action}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {formatActor(entry)}
                      </TableCell>
                      <TableCell className="font-mono text-sm max-w-[200px] truncate" title={entry.resource?.path || ''}>
                        {entry.resource?.type ? `[${entry.resource.type}] ` : ''}
                        {entry.resource?.path || '-'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {entry.resource?.namespace || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={severityColor[entry.severity?.toLowerCase()] || ''}
                        >
                          {entry.severity || '-'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={resultColor[entry.result?.toLowerCase()] || ''}
                        >
                          {entry.result || '-'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate" title={entry.detail || ''}>
                        {entry.detail || '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {!loading && total > 0 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Showing {showFrom}-{showTo} of {total}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={offset === 0}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleNext}
                  disabled={offset + PAGE_SIZE >= total}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
