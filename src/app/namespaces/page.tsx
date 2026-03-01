'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, RefreshCw, Trash2, FolderTree } from 'lucide-react';
import type { NamespaceResponse } from '@vibr8vault/sdk';

export default function NamespacesPage() {
  const { client } = useAuth();

  // Namespace list state
  const [namespaces, setNamespaces] = useState<NamespaceResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Create namespace dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Delete namespace dialog state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteNs, setDeleteNs] = useState<NamespaceResponse | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Fetch namespaces
  const fetchNamespaces = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await client.namespaces.list();
      setNamespaces(resp.namespaces || []);
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

  // Create namespace handler
  const handleCreate = async () => {
    if (!createName.trim()) return;
    if (createName.trim().includes('/')) {
      setCreateError('Namespace names cannot contain slashes. Use hyphens or underscores instead (e.g. "prod-nginx").');
      return;
    }

    setCreating(true);
    setCreateError('');
    try {
      await client.namespaces.create(createName.trim());
      setCreateOpen(false);
      resetCreateForm();
      await fetchNamespaces();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create namespace');
    } finally {
      setCreating(false);
    }
  };

  const resetCreateForm = () => {
    setCreateName('');
    setCreateError('');
  };

  // Open delete confirmation for a namespace
  const openDelete = (ns: NamespaceResponse) => {
    setDeleteNs(ns);
    setDeleteError('');
    setDeleteOpen(true);
  };

  // Delete namespace handler
  const handleDelete = async () => {
    if (!deleteNs) return;

    setDeleting(true);
    setDeleteError('');
    try {
      await client.namespaces.delete(deleteNs.name);
      setDeleteOpen(false);
      setDeleteNs(null);
      await fetchNamespaces();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete namespace');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Namespaces</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchNamespaces} disabled={loading}>
            <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => {
              resetCreateForm();
              setCreateOpen(true);
            }}
          >
            <Plus className="size-4" />
            Create Namespace
          </Button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Namespaces table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[80px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              // Skeleton loading rows
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-10 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : namespaces.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <FolderTree className="size-10 opacity-30" />
                    <p className="text-sm">No namespaces found</p>
                    <p className="text-xs">Create a namespace to get started</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              namespaces.map((ns) => (
                <TableRow key={ns.name}>
                  <TableCell className="font-medium font-mono">
                    {ns.name}
                  </TableCell>
                  <TableCell>
                    <Badge variant={ns.type === 'default' ? 'default' : 'secondary'}>
                      {ns.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {ns.owner || '\u2014'}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(ns.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {ns.type !== 'default' && (
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => openDelete(ns)}
                        title={`Delete ${ns.name}`}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create namespace dialog */}
      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) resetCreateForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Namespace</DialogTitle>
            <DialogDescription>
              Create a new shared namespace. Only shared namespaces can be created
              manually; the default namespace is created automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-name">Namespace Name</Label>
              <Input
                id="create-name"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="Enter namespace name"
                autoComplete="off"
              />
            </div>

            {createError && (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {createError}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateOpen(false);
                resetCreateForm();
              }}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={creating || !createName.trim()}
            >
              {creating ? 'Creating...' : 'Create Namespace'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete namespace confirmation dialog */}
      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) {
            setDeleteNs(null);
            setDeleteError('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Namespace</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the namespace{' '}
              <span className="font-mono font-semibold">{deleteNs?.name}</span>?
              This action cannot be undone. All secrets and policies within this
              namespace will be permanently removed.
            </DialogDescription>
          </DialogHeader>

          {deleteError && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {deleteError}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteOpen(false);
                setDeleteNs(null);
                setDeleteError('');
              }}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete Namespace'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
