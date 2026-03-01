'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import {
  Plus,
  RefreshCw,
  Trash2,
  Save,
  ShieldCheck,
  FileText,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function NamespacePoliciesPage() {
  const { client } = useAuth();
  const router = useRouter();
  const params = useParams<{ namespace: string[] }>();
  const namespace = params.namespace.join('/');

  // Policy list state
  const [policies, setPolicies] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Selected policy state
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [yamlContent, setYamlContent] = useState('');
  const [loadingYaml, setLoadingYaml] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Create new policy state
  const [creating, setCreating] = useState(false);
  const [newYaml, setNewYaml] = useState('');

  // Save state
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');

  // Delete dialog state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteName, setDeleteName] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Fetch policy list
  const fetchPolicies = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await client.policies.list(namespace);
      setPolicies(data.policies || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load policies');
      setPolicies([]);
    } finally {
      setLoading(false);
    }
  }, [client, namespace]);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  // Load a policy's YAML
  const loadPolicy = async (name: string) => {
    setLoadingYaml(true);
    setSaveError('');
    setSaveSuccess('');
    setCreating(false);
    try {
      const data = await client.policies.get(name, namespace);
      setSelectedName(name);
      setYamlContent(data.yaml || '');
      setDirty(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load policy');
    } finally {
      setLoadingYaml(false);
    }
  };

  // Save policy (create or update)
  const handleSave = async (yaml: string) => {
    setSaving(true);
    setSaveError('');
    setSaveSuccess('');
    try {
      const data = await client.policies.create(yaml, namespace);
      setSaveSuccess(`Policy "${data.name}" saved successfully.`);
      setDirty(false);

      if (creating) {
        setCreating(false);
        setSelectedName(data.name);
        setYamlContent(yaml);
      }

      await fetchPolicies();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save policy');
    } finally {
      setSaving(false);
    }
  };

  // Start creating a new policy
  const startCreate = () => {
    setSelectedName(null);
    setYamlContent('');
    setDirty(false);
    setSaveError('');
    setSaveSuccess('');
    setNewYaml(`name: my-policy\nrules:\n  - path: "apps/*"\n    capabilities: [read, list]\n`);
    setCreating(true);
  };

  // Open delete confirmation
  const openDelete = (name: string) => {
    setDeleteName(name);
    setDeleteError('');
    setDeleteOpen(true);
  };

  // Delete a policy
  const handleDelete = async () => {
    if (!deleteName) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await client.policies.delete(deleteName, namespace);

      if (selectedName === deleteName) {
        setSelectedName(null);
        setYamlContent('');
        setDirty(false);
      }

      setDeleteOpen(false);
      setDeleteName(null);
      setSaveSuccess(`Policy "${deleteName}" deleted.`);
      await fetchPolicies();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete policy');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push('/policies')}>
            <ArrowLeft className="size-4" />
          </Button>
          <h1 className="text-3xl font-bold">Policies</h1>
          <Badge variant="outline" className="font-mono text-sm">{namespace}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchPolicies} disabled={loading}>
            <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={startCreate}>
            <Plus className="size-4" />
            Create Policy
          </Button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Success banner */}
      {saveSuccess && (
        <div className="rounded-lg border border-green-500/50 bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-400">
          {saveSuccess}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Policy list panel */}
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-muted/50 px-4 py-3 border-b">
            <h2 className="font-semibold text-sm">Policy Names</h2>
          </div>
          <div className="divide-y">
            {loading ? (
              <div className="px-4 py-8 text-center text-muted-foreground text-sm">
                Loading policies...
              </div>
            ) : policies.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <ShieldCheck className="size-10 opacity-30" />
                  <p className="text-sm">No policies found</p>
                  <p className="text-xs">Create a policy to get started</p>
                </div>
              </div>
            ) : (
              policies.map((name) => (
                <div
                  key={name}
                  className={`flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors ${
                    selectedName === name && !creating ? 'bg-muted' : ''
                  }`}
                  onClick={() => loadPolicy(name)}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="size-4 shrink-0 text-muted-foreground" />
                    <span className="text-sm font-mono truncate">{name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      openDelete(name);
                    }}
                    title={`Delete ${name}`}
                    className="text-destructive hover:text-destructive shrink-0"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* YAML editor panel */}
        <div className="md:col-span-2 border rounded-lg overflow-hidden">
          <div className="bg-muted/50 px-4 py-3 border-b flex items-center justify-between">
            <h2 className="font-semibold text-sm">
              {creating
                ? 'New Policy'
                : selectedName
                  ? (
                      <span className="flex items-center gap-2">
                        <span>Policy:</span>
                        <Badge variant="outline" className="font-mono">{selectedName}</Badge>
                        {dirty && <Badge variant="secondary" className="text-xs">Modified</Badge>}
                      </span>
                    )
                  : 'Select a policy'}
            </h2>
            {(creating || selectedName) && (
              <Button
                size="sm"
                onClick={() =>
                  handleSave(creating ? newYaml : yamlContent)
                }
                disabled={saving || (!creating && !dirty)}
              >
                <Save className="size-4" />
                {saving ? 'Saving...' : 'Save'}
              </Button>
            )}
          </div>

          <div className="p-4">
            {saveError && (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive mb-4">
                {saveError}
              </div>
            )}

            {creating ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Write your policy YAML below. The policy name is defined inside the YAML document.
                  It will be saved to the <Badge variant="outline" className="font-mono text-xs">{namespace}</Badge> namespace.
                </p>
                <Textarea
                  value={newYaml}
                  onChange={(e) => setNewYaml(e.target.value)}
                  className="font-mono text-sm min-h-[300px]"
                  placeholder={`name: my-policy\nrules:\n  - path: "apps/*"\n    capabilities: [read, list]`}
                />
              </div>
            ) : selectedName ? (
              <div className="space-y-3">
                {loadingYaml ? (
                  <div className="text-center text-muted-foreground py-8 text-sm">
                    Loading policy...
                  </div>
                ) : (
                  <Textarea
                    value={yamlContent}
                    onChange={(e) => {
                      setYamlContent(e.target.value);
                      setDirty(true);
                      setSaveSuccess('');
                    }}
                    className="font-mono text-sm min-h-[300px]"
                  />
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <ShieldCheck className="size-12 opacity-20 mb-4" />
                <p className="text-sm">Select a policy from the list to view and edit its YAML.</p>
                <p className="text-xs mt-1">Or create a new policy using the button above.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) {
            setDeleteName(null);
            setDeleteError('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Policy</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the policy{' '}
              <span className="font-mono font-semibold">{deleteName}</span>?
              Tokens referencing this policy will lose its permissions.
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
                setDeleteName(null);
                setDeleteError('');
              }}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete Policy'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
