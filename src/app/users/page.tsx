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
import { Plus, Pencil, Trash2, RefreshCw, Users, ShieldCheck } from 'lucide-react';
import type { UserResponse } from '@vibr8vault/sdk';

export default function UsersPage() {
  const { client } = useAuth();

  // User list state
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Create user dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [createUsername, setCreateUsername] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createPolicies, setCreatePolicies] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Edit user dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserResponse | null>(null);
  const [editPassword, setEditPassword] = useState('');
  const [editPolicies, setEditPolicies] = useState('');
  const [updating, setUpdating] = useState(false);
  const [editError, setEditError] = useState('');

  // Delete user dialog state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteUser, setDeleteUser] = useState<UserResponse | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Fetch users
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await client.users.list();
      setUsers(resp.users || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Parse comma-separated policies into an array, filtering empty strings
  const parsePolicies = (input: string): string[] => {
    return input
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
  };

  // Create user handler
  const handleCreate = async () => {
    if (!createUsername.trim() || !createPassword.trim()) return;

    setCreating(true);
    setCreateError('');
    try {
      const policies = parsePolicies(createPolicies);
      await client.users.create({
        username: createUsername.trim(),
        password: createPassword,
        policies: policies.length > 0 ? policies : undefined,
      });
      setCreateOpen(false);
      resetCreateForm();
      await fetchUsers();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  const resetCreateForm = () => {
    setCreateUsername('');
    setCreatePassword('');
    setCreatePolicies('');
    setCreateError('');
  };

  // Open edit dialog for a user
  const openEdit = (user: UserResponse) => {
    setEditUser(user);
    setEditPassword('');
    setEditPolicies((user.policies ?? []).join(', '));
    setEditError('');
    setEditOpen(true);
  };

  // Update user handler
  const handleUpdate = async () => {
    if (!editUser) return;

    setUpdating(true);
    setEditError('');
    try {
      const fields: { password?: string; policies?: string[] } = {};
      if (editPassword.trim()) {
        fields.password = editPassword;
      }
      fields.policies = parsePolicies(editPolicies);

      await client.users.update(editUser.id, fields);
      setEditOpen(false);
      setEditUser(null);
      await fetchUsers();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update user');
    } finally {
      setUpdating(false);
    }
  };

  // Open delete confirmation for a user
  const openDelete = (user: UserResponse) => {
    setDeleteUser(user);
    setDeleteError('');
    setDeleteOpen(true);
  };

  // Delete user handler
  const handleDelete = async () => {
    if (!deleteUser) return;

    setDeleting(true);
    setDeleteError('');
    try {
      await client.users.delete(deleteUser.id);
      setDeleteOpen(false);
      setDeleteUser(null);
      await fetchUsers();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete user');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Users</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchUsers} disabled={loading}>
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
            Create User
          </Button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Users table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Username</TableHead>
              <TableHead>Policies</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[120px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              // Skeleton loading rows
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Users className="size-10 opacity-30" />
                    <p className="text-sm">No users found</p>
                    <p className="text-xs">Create a user to get started</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium font-mono">
                    {user.username}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.policies?.length > 0 ? (
                        user.policies.map((policy) => (
                          <Badge key={policy} variant="outline">
                            {policy}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground text-xs">
                          No policies
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.admin ? (
                      <Badge variant="default" className="gap-1">
                        <ShieldCheck className="size-3" />
                        Admin
                      </Badge>
                    ) : (
                      <Badge variant="secondary">User</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(user.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => openEdit(user)}
                        title={`Edit ${user.username}`}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => openDelete(user)}
                        title={`Delete ${user.username}`}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create user dialog */}
      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) resetCreateForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create User</DialogTitle>
            <DialogDescription>
              Add a new user account to Vibr8Vault.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-username">Username</Label>
              <Input
                id="create-username"
                value={createUsername}
                onChange={(e) => setCreateUsername(e.target.value)}
                placeholder="Enter username"
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-password">Password</Label>
              <Input
                id="create-password"
                type="password"
                value={createPassword}
                onChange={(e) => setCreatePassword(e.target.value)}
                placeholder="Enter password"
                autoComplete="new-password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-policies">Policies</Label>
              <Input
                id="create-policies"
                value={createPolicies}
                onChange={(e) => setCreatePolicies(e.target.value)}
                placeholder="policy1, policy2, ..."
              />
              <p className="text-xs text-muted-foreground">
                Comma-separated list of policy names. Leave empty for no policies.
              </p>
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
              disabled={creating || !createUsername.trim() || !createPassword.trim()}
            >
              {creating ? 'Creating...' : 'Create User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit user dialog */}
      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) {
            setEditUser(null);
            setEditError('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update{' '}
              <span className="font-mono font-semibold">{editUser?.username}</span>
              &apos;s settings. Leave password blank to keep it unchanged.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-password">New Password</Label>
              <Input
                id="edit-password"
                type="password"
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
                placeholder="Leave blank to keep current password"
                autoComplete="new-password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-policies">Policies</Label>
              <Input
                id="edit-policies"
                value={editPolicies}
                onChange={(e) => setEditPolicies(e.target.value)}
                placeholder="policy1, policy2, ..."
              />
              <p className="text-xs text-muted-foreground">
                Comma-separated list of policy names. Clear to remove all policies.
              </p>
            </div>

            {editError && (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {editError}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditOpen(false);
                setEditUser(null);
                setEditError('');
              }}
              disabled={updating}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updating}>
              {updating ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete user confirmation dialog */}
      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) {
            setDeleteUser(null);
            setDeleteError('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the user{' '}
              <span className="font-mono font-semibold">{deleteUser?.username}</span>?
              This action cannot be undone.
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
                setDeleteUser(null);
                setDeleteError('');
              }}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
