'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { copyToClipboard } from '@/lib/utils';
import {
  ChevronRight,
  Folder,
  FileKey,
  Plus,
  Save,
  Trash2,
  Eye,
  EyeOff,
  X,
  RefreshCw,
  Home,
  ArrowLeft,
  FolderTree,
  Info,
  Terminal,
  Copy,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
import type { VersionInfo } from '@vibr8vault/sdk';

function getNamespacePaths(nsName: string) {
  const isDefault = nsName === 'default';
  return {
    api: isDefault ? '/v1/secrets/' : `/v1/namespaces/${nsName}/secrets/`,
    cli: isDefault ? 'vv secret list /' : `vv secret list / -n ${nsName}`,
  };
}

function getSecretPaths(nsName: string, secretPath: string) {
  const isDefault = nsName === 'default';
  return {
    api: isDefault ? `/v1/secrets/${secretPath}` : `/v1/namespaces/${nsName}/secrets/${secretPath}`,
    cli: isDefault ? `vv secret read ${secretPath}` : `vv secret read ${secretPath} -n ${nsName}`,
  };
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };
  return (
    <Button variant="ghost" size="icon-xs" onClick={handleCopy} title="Copy to clipboard">
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
    </Button>
  );
}

export default function NamespaceSecretsPage() {
  const { client } = useAuth();
  const router = useRouter();
  const params = useParams<{ namespace: string[] }>();
  const namespace = params.namespace.join('/');

  // Namespace validation
  const [nsValid, setNsValid] = useState(true);

  useEffect(() => {
    client.namespaces.get(namespace).catch(() => {
      setNsValid(false);
    });
  }, [client, namespace]);

  // Navigation state
  const [currentPath, setCurrentPath] = useState('');
  const [keys, setKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState('');

  // Secret viewer/editor state
  const [selectedSecret, setSelectedSecret] = useState<{
    path: string;
    data: Record<string, string>;
    version: number;
    created_at: string;
  } | null>(null);
  const [editData, setEditData] = useState<{ key: string; value: string }[]>([]);
  const [versions, setVersions] = useState<VersionInfo[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<number | undefined>();
  const [secretError, setSecretError] = useState('');
  const [saving, setSaving] = useState(false);
  const [secretLoading, setSecretLoading] = useState(false);

  // Visibility toggles for secret values
  const [visibleValues, setVisibleValues] = useState<Set<number>>(new Set());

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteHard, setDeleteHard] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Create secret dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newSecretName, setNewSecretName] = useState('');
  const [creating, setCreating] = useState(false);

  // Fetch keys at the current path
  const fetchKeys = useCallback(async () => {
    setLoading(true);
    setListError('');
    try {
      const resp = await client.secrets.listNs(namespace, currentPath);
      setKeys(resp.keys || []);
    } catch {
      setKeys([]);
    } finally {
      setLoading(false);
    }
  }, [client, currentPath, namespace]);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  // Navigate into a directory or load a secret
  const navigateTo = (key: string) => {
    if (key.endsWith('/')) {
      setCurrentPath(currentPath + key);
      setSelectedSecret(null);
      setSecretError('');
      setVisibleValues(new Set());
    } else {
      loadSecret(currentPath + key);
    }
  };

  // Load a specific secret
  const loadSecret = async (path: string, version?: number) => {
    setSecretLoading(true);
    setSecretError('');
    setVisibleValues(new Set());
    try {
      const resp = await client.secrets.readNs(namespace, path, version !== undefined ? { version } : undefined);
      setSelectedSecret({
        path: resp.path,
        data: resp.data,
        version: resp.version,
        created_at: resp.created_at,
      });
      setEditData(
        Object.entries(resp.data).map(([key, value]) => ({ key, value }))
      );
      setSelectedVersion(resp.version);
      try {
        const vers = await client.secrets.versionsNs(namespace, path);
        setVersions(vers.versions || []);
      } catch {
        setVersions([]);
      }
    } catch (err) {
      setSecretError(err instanceof Error ? err.message : 'Failed to load secret');
      setSelectedSecret(null);
    } finally {
      setSecretLoading(false);
    }
  };

  // Breadcrumb navigation
  const pathParts = currentPath.split('/').filter(Boolean);

  const navigateToRoot = () => {
    setCurrentPath('');
    setSelectedSecret(null);
    setSecretError('');
    setVisibleValues(new Set());
  };

  const navigateToIndex = (index: number) => {
    setCurrentPath(pathParts.slice(0, index + 1).join('/') + '/');
    setSelectedSecret(null);
    setSecretError('');
    setVisibleValues(new Set());
  };

  // Edit handlers
  const updateKey = (index: number, newKey: string) => {
    setEditData((prev) => prev.map((item, i) => (i === index ? { ...item, key: newKey } : item)));
  };

  const updateValue = (index: number, newValue: string) => {
    setEditData((prev) => prev.map((item, i) => (i === index ? { ...item, value: newValue } : item)));
  };

  const removeRow = (index: number) => {
    setEditData((prev) => prev.filter((_, i) => i !== index));
    setVisibleValues((prev) => {
      const next = new Set<number>();
      prev.forEach((v) => {
        if (v < index) next.add(v);
        else if (v > index) next.add(v - 1);
      });
      return next;
    });
  };

  const addRow = () => {
    setEditData((prev) => [...prev, { key: '', value: '' }]);
  };

  const toggleValueVisibility = (index: number) => {
    setVisibleValues((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const hasChanges = () => {
    if (!selectedSecret) return false;
    const originalEntries = Object.entries(selectedSecret.data);
    if (originalEntries.length !== editData.length) return true;
    return editData.some(({ key, value }, i) => {
      if (i >= originalEntries.length) return true;
      return originalEntries[i][0] !== key || originalEntries[i][1] !== value;
    });
  };

  const handleSave = async () => {
    if (!selectedSecret) return;
    const emptyKeys = editData.filter((item) => item.key.trim() === '');
    if (emptyKeys.length > 0) {
      setSecretError('All keys must be non-empty');
      return;
    }
    const keySet = new Set(editData.map((item) => item.key));
    if (keySet.size !== editData.length) {
      setSecretError('Duplicate keys are not allowed');
      return;
    }

    setSaving(true);
    setSecretError('');
    try {
      const data: Record<string, string> = {};
      editData.forEach(({ key, value }) => {
        data[key] = value;
      });
      await client.secrets.writeNs(namespace, selectedSecret.path, data);
      await loadSecret(selectedSecret.path);
      fetchKeys();
    } catch (err) {
      setSecretError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedSecret) return;
    setDeleting(true);
    try {
      await client.secrets.deleteNs(namespace, selectedSecret.path, { hard: deleteHard });
      setSelectedSecret(null);
      setDeleteDialogOpen(false);
      setDeleteHard(false);
      setSecretError('');
      setVisibleValues(new Set());
      fetchKeys();
    } catch (err) {
      setSecretError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  const handleCreate = async () => {
    if (!newSecretName.trim()) return;
    setCreating(true);
    setSecretError('');
    try {
      const fullPath = currentPath + newSecretName.trim();
      await client.secrets.writeNs(namespace, fullPath, { key: 'value' });
      setCreateDialogOpen(false);
      setNewSecretName('');
      await fetchKeys();
      await loadSecret(fullPath);
    } catch (err) {
      setSecretError(err instanceof Error ? err.message : 'Failed to create secret');
    } finally {
      setCreating(false);
    }
  };

  const handleVersionChange = (version: number) => {
    if (!selectedSecret) return;
    setSelectedVersion(version);
    loadSecret(selectedSecret.path, version);
  };

  if (!nsValid) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
        <FolderTree className="size-12 opacity-30" />
        <p className="text-sm">Namespace &quot;{namespace}&quot; not found</p>
        <Button variant="outline" size="sm" onClick={() => router.push('/secrets')}>
          <ArrowLeft className="size-4" />
          Back to namespaces
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push('/secrets')}>
            <ArrowLeft className="size-4" />
            Namespaces
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <h1 className="text-3xl font-bold">Secrets</h1>
          <Badge variant="outline" className="text-sm">{namespace}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchKeys} disabled={loading}>
            <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => { setSecretError(''); setCreateDialogOpen(true); }}>
            <Plus className="size-4" />
            New Secret
          </Button>
        </div>
      </div>

      {/* API & CLI reference */}
      <div className="rounded-lg border bg-muted/30 px-4 py-3">
        <div className="flex items-start gap-2">
          <Info className="size-4 text-muted-foreground mt-0.5 shrink-0" />
          <div className="space-y-2 min-w-0">
            <p className="text-sm text-muted-foreground">
              Access secrets in this namespace via the REST API or the <span className="font-mono">vv</span> CLI.
            </p>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <Terminal className="size-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs text-muted-foreground shrink-0">API</span>
                <code className="text-xs font-mono bg-muted rounded px-1.5 py-0.5 truncate">
                  {getNamespacePaths(namespace).api}
                </code>
                <CopyButton text={getNamespacePaths(namespace).api} />
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <Terminal className="size-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs text-muted-foreground shrink-0">CLI</span>
                <code className="text-xs font-mono bg-muted rounded px-1.5 py-0.5 truncate">
                  {getNamespacePaths(namespace).cli}
                </code>
                <CopyButton text={getNamespacePaths(namespace).cli} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-6 min-h-[600px]">
        {/* Left panel: Tree browser */}
        <div className="w-80 shrink-0 border rounded-lg overflow-hidden flex flex-col">
          {/* Breadcrumb */}
          <div className="p-3 border-b bg-muted/50">
            <nav className="flex items-center gap-1 text-sm flex-wrap">
              <button
                onClick={navigateToRoot}
                className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Home className="size-3.5" />
                <span>root</span>
              </button>
              {pathParts.map((part, index) => (
                <span key={index} className="flex items-center gap-1">
                  <ChevronRight className="size-3 text-muted-foreground" />
                  <button
                    onClick={() => navigateToIndex(index)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {part}
                  </button>
                </span>
              ))}
            </nav>
          </div>

          {/* Key list */}
          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                Loading...
              </div>
            ) : listError ? (
              <div className="p-4 text-center text-destructive text-sm">
                {listError}
              </div>
            ) : keys.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                No secrets at this path.
              </div>
            ) : (
              <ul className="divide-y">
                {keys.map((key) => {
                  const isDir = key.endsWith('/');
                  const displayKey = isDir ? key.slice(0, -1) : key;
                  const isSelected = selectedSecret?.path === currentPath + key;
                  return (
                    <li key={key}>
                      <button
                        onClick={() => navigateTo(key)}
                        className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left hover:bg-accent transition-colors ${
                          isSelected ? 'bg-accent' : ''
                        }`}
                      >
                        {isDir ? (
                          <Folder className="size-4 text-muted-foreground shrink-0" />
                        ) : (
                          <FileKey className="size-4 text-muted-foreground shrink-0" />
                        )}
                        <span className="truncate">{displayKey}</span>
                        {isDir && (
                          <ChevronRight className="size-4 text-muted-foreground ml-auto shrink-0" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Right panel: Secret viewer/editor */}
        <div className="flex-1 border rounded-lg overflow-hidden flex flex-col">
          {secretLoading ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              Loading secret...
            </div>
          ) : selectedSecret ? (
            <>
              {/* Secret header */}
              <div className="p-4 border-b bg-muted/50">
                <div className="flex items-center justify-between">
                  <div className="space-y-1 min-w-0">
                    <h2 className="text-lg font-semibold font-mono truncate">
                      {selectedSecret.path}
                    </h2>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Badge variant="outline">v{selectedSecret.version}</Badge>
                      <span>
                        Created{' '}
                        {new Date(selectedSecret.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSave}
                      disabled={saving || !hasChanges()}
                    >
                      <Save className="size-4" />
                      {saving ? 'Saving...' : 'Save'}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteDialogOpen(true)}
                    >
                      <Trash2 className="size-4" />
                      Delete
                    </Button>
                  </div>
                </div>

                {/* Version selector */}
                {versions.length > 0 && (
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Version:</span>
                    <select
                      value={selectedVersion ?? ''}
                      onChange={(e) => handleVersionChange(Number(e.target.value))}
                      className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                    >
                      {versions.map((v) => (
                        <option key={v.version} value={v.version} disabled={v.deleted}>
                          v{v.version}
                          {v.deleted ? ' (deleted)' : ''}
                          {' - '}
                          {new Date(v.created_at).toLocaleDateString()}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Secret-level API & CLI reference */}
                <div className="mt-3 flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <Terminal className="size-3.5 text-muted-foreground shrink-0" />
                    <span className="text-xs text-muted-foreground shrink-0">API</span>
                    <code className="text-xs font-mono bg-muted rounded px-1.5 py-0.5 truncate">
                      {getSecretPaths(namespace, selectedSecret.path).api}
                    </code>
                    <CopyButton text={getSecretPaths(namespace, selectedSecret.path).api} />
                  </div>
                  <div className="flex items-center gap-2 min-w-0">
                    <Terminal className="size-3.5 text-muted-foreground shrink-0" />
                    <span className="text-xs text-muted-foreground shrink-0">CLI</span>
                    <code className="text-xs font-mono bg-muted rounded px-1.5 py-0.5 truncate">
                      {getSecretPaths(namespace, selectedSecret.path).cli}
                    </code>
                    <CopyButton text={getSecretPaths(namespace, selectedSecret.path).cli} />
                  </div>
                </div>
              </div>

              {/* Error message */}
              {secretError && (
                <div className="px-4 py-2 bg-destructive/10 text-destructive text-sm border-b">
                  {secretError}
                </div>
              )}

              {/* Key-value table */}
              <div className="flex-1 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[35%]">Key</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {editData.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          className="text-center text-muted-foreground py-8"
                        >
                          No key-value pairs. Click &quot;Add Key&quot; to create one.
                        </TableCell>
                      </TableRow>
                    ) : (
                      editData.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Input
                              value={item.key}
                              onChange={(e) => updateKey(index, e.target.value)}
                              placeholder="Key name"
                              className="font-mono text-sm"
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Input
                                type={visibleValues.has(index) ? 'text' : 'password'}
                                value={item.value}
                                onChange={(e) => updateValue(index, e.target.value)}
                                placeholder="Value"
                                className="font-mono text-sm"
                              />
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => toggleValueVisibility(index)}
                                title={visibleValues.has(index) ? 'Hide value' : 'Show value'}
                              >
                                {visibleValues.has(index) ? (
                                  <EyeOff className="size-3.5" />
                                ) : (
                                  <Eye className="size-3.5" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => removeRow(index)}
                              title="Remove key"
                              className="text-destructive hover:text-destructive"
                            >
                              <X className="size-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Add key button */}
              <Separator />
              <div className="p-3">
                <Button variant="outline" size="sm" onClick={addRow}>
                  <Plus className="size-4" />
                  Add Key
                </Button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2">
              <FileKey className="size-12 opacity-30" />
              <p className="text-sm">Select a secret to view its contents</p>
              <p className="text-xs">
                Or create a new secret using the button above
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Secret</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the secret at{' '}
              <span className="font-mono font-semibold">
                {selectedSecret?.path}
              </span>
              ?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={deleteHard}
                onChange={(e) => setDeleteHard(e.target.checked)}
                className="rounded"
              />
              <span>
                Hard delete (permanently removes all versions)
              </span>
            </label>
            {deleteHard && (
              <p className="text-sm text-destructive">
                This action cannot be undone. All versions of this secret will
                be permanently destroyed.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setDeleteHard(false);
              }}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : deleteHard ? 'Hard Delete' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create secret dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Secret</DialogTitle>
            <DialogDescription>
              Enter a name for the new secret. It will be created at the path{' '}
              <span className="font-mono">
                {currentPath || '/'}
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-2 font-mono text-sm">
              <span className="text-muted-foreground">{currentPath}</span>
              <Input
                value={newSecretName}
                onChange={(e) => setNewSecretName(e.target.value)}
                placeholder="secret-name"
                className="font-mono"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreate();
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              The secret will be initialized with a placeholder key-value pair.
              You can edit it after creation.
            </p>
            {secretError && createDialogOpen && (
              <div className="rounded-md bg-destructive/10 text-destructive text-sm px-3 py-2">
                {secretError}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateDialogOpen(false);
                setNewSecretName('');
              }}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={creating || !newSecretName.trim()}>
              {creating ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
