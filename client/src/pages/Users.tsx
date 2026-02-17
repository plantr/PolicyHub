import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { UserCog, Plus, Pencil, UserX, Mail, Phone } from "lucide-react";
import type { User, BusinessUnit, AdminRecord } from "@shared/schema";
import { insertUserSchema } from "@shared/schema";

const userFormSchema = insertUserSchema.extend({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  role: z.string().min(1, "Role is required"),
  jobTitle: z.string().nullable().default(null),
  department: z.string().nullable().default(null),
  businessUnitId: z.coerce.number().nullable().default(null),
  status: z.string().default("Active"),
  phone: z.string().nullable().default(null),
  notes: z.string().nullable().default(null),
});

type UserFormValues = z.infer<typeof userFormSchema>;

const FALLBACK_ROLES = ["Admin", "Compliance Officer", "Policy Owner", "Reviewer", "Approver", "Auditor", "Viewer"];
const USER_STATUSES = ["Active", "Inactive"];
const DEPARTMENTS = ["Compliance", "Legal", "Risk", "Operations", "Finance", "Technology", "Executive", "HR"];

function getStatusVariant(status: string) {
  switch (status) {
    case "Active": return "default" as const;
    case "Inactive": return "secondary" as const;
    default: return "secondary" as const;
  }
}

export default function Users() {
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deactivateConfirmOpen, setDeactivateConfirmOpen] = useState(false);
  const [deactivatingUser, setDeactivatingUser] = useState<User | null>(null);
  const { toast } = useToast();

  const { data: allUsers = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: businessUnits = [] } = useQuery<BusinessUnit[]>({
    queryKey: ["/api/business-units"],
  });

  const { data: adminRoles = [] } = useQuery<AdminRecord[]>({
    queryKey: ["/api/admin", "roles"],
    queryFn: async () => {
      const res = await fetch("/api/admin/roles");
      if (!res.ok) throw new Error("Failed to fetch roles");
      return res.json();
    },
  });

  const roleOptions = adminRoles.filter(r => r.active).length > 0
    ? adminRoles.filter(r => r.active).map(r => r.label)
    : FALLBACK_ROLES;

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      role: "",
      jobTitle: null,
      department: null,
      businessUnitId: null,
      status: "Active",
      phone: null,
      notes: null,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: UserFormValues) => {
      const res = await apiRequest("POST", "/api/users", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setDialogOpen(false);
      form.reset();
      toast({ title: "User created" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UserFormValues }) => {
      const res = await apiRequest("PUT", `/api/users/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setDialogOpen(false);
      setEditingUser(null);
      form.reset();
      toast({ title: "User updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("PUT", `/api/users/${id}/deactivate`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setDeactivateConfirmOpen(false);
      setDeactivatingUser(null);
      toast({ title: "User deactivated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const openCreate = () => {
    setEditingUser(null);
    form.reset({
      firstName: "",
      lastName: "",
      email: "",
      role: "",
      jobTitle: null,
      department: null,
      businessUnitId: null,
      status: "Active",
      phone: null,
      notes: null,
    });
    setDialogOpen(true);
  };

  const openEdit = (user: User) => {
    setEditingUser(user);
    form.reset({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      jobTitle: user.jobTitle || null,
      department: user.department || null,
      businessUnitId: user.businessUnitId || null,
      status: user.status,
      phone: user.phone || null,
      notes: user.notes || null,
    });
    setDialogOpen(true);
  };

  const onSubmit = (values: UserFormValues) => {
    if (editingUser) {
      updateMutation.mutate({ id: editingUser.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  };

  const activeBUs = businessUnits.filter((bu) => bu.status !== "Archived");

  const getBUName = (id: number | null) => {
    if (!id) return "-";
    const bu = businessUnits.find((b) => b.id === id);
    return bu ? bu.name : "-";
  };

  const filteredUsers = allUsers.filter((u) => {
    if (roleFilter !== "all" && u.role !== roleFilter) return false;
    if (statusFilter !== "all" && u.status !== statusFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const fullName = `${u.firstName} ${u.lastName}`.toLowerCase();
      return (
        fullName.includes(term) ||
        u.email.toLowerCase().includes(term) ||
        (u.department && u.department.toLowerCase().includes(term)) ||
        (u.jobTitle && u.jobTitle.toLowerCase().includes(term))
      );
    }
    return true;
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <UserCog className="h-6 w-6 text-muted-foreground" />
          <h1 className="text-2xl font-semibold" data-testid="text-page-title">Users</h1>
        </div>
        <Button onClick={openCreate} data-testid="button-create-user">
          <Plus className="mr-1 h-4 w-4" />
          Add User
        </Button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Input
          placeholder="Search by name, email, department..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-xs"
          data-testid="input-search-users"
        />
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-role-filter">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {roleOptions.map((r) => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]" data-testid="select-status-filter">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {USER_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground" data-testid="text-empty-state">
              {allUsers.length === 0 ? "No users yet. Add your first user." : "No users match your filters."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Business Unit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                    <TableCell>
                      <div>
                        <span className="font-medium" data-testid={`text-user-name-${user.id}`}>
                          {user.firstName} {user.lastName}
                        </span>
                        {user.jobTitle && (
                          <span className="block text-xs text-muted-foreground">{user.jobTitle}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm" data-testid={`text-user-email-${user.id}`}>{user.email}</span>
                      </div>
                      {user.phone && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{user.phone}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" data-testid={`badge-user-role-${user.id}`}>{user.role}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{user.department || "-"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{getBUName(user.businessUnitId)}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(user.status)} data-testid={`badge-user-status-${user.id}`}>
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEdit(user)}
                          data-testid={`button-edit-user-${user.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {user.status === "Active" && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => { setDeactivatingUser(user); setDeactivateConfirmOpen(true); }}
                            data-testid={`button-deactivate-user-${user.id}`}
                          >
                            <UserX className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-title">{editingUser ? "Edit User" : "Add User"}</DialogTitle>
            <DialogDescription>
              {editingUser ? "Update user details." : "Add a new user to the system."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="firstName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl><Input {...field} data-testid="input-first-name" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="lastName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl><Input {...field} data-testid="input-last-name" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl><Input type="email" {...field} data-testid="input-email" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="role" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-role">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {roleOptions.map((r) => (
                          <SelectItem key={r} value={r}>{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="department" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department</FormLabel>
                    <Select onValueChange={(v) => field.onChange(v === "__none__" ? null : v)} value={field.value || "__none__"}>
                      <FormControl>
                        <SelectTrigger data-testid="select-department">
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {DEPARTMENTS.map((d) => (
                          <SelectItem key={d} value={d}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="jobTitle" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Title</FormLabel>
                    <FormControl><Input {...field} value={field.value || ""} onChange={(e) => field.onChange(e.target.value || null)} data-testid="input-job-title" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl><Input {...field} value={field.value || ""} onChange={(e) => field.onChange(e.target.value || null)} data-testid="input-phone" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="businessUnitId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Business Unit</FormLabel>
                  <Select onValueChange={(v) => field.onChange(v === "__none__" ? null : Number(v))} value={field.value ? String(field.value) : "__none__"}>
                    <FormControl>
                      <SelectTrigger data-testid="select-business-unit">
                        <SelectValue placeholder="Select business unit" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {activeBUs.map((bu) => (
                        <SelectItem key={bu.id} value={String(bu.id)}>{bu.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              {editingUser && (
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-status">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {USER_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              )}
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value || ""}
                      onChange={(e) => field.onChange(e.target.value || null)}
                      className="resize-none"
                      rows={3}
                      data-testid="input-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="submit" disabled={isPending} data-testid="button-submit-user">
                  {isPending ? "Saving..." : editingUser ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deactivateConfirmOpen} onOpenChange={setDeactivateConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate {deactivatingUser?.firstName} {deactivatingUser?.lastName}? They will no longer be able to perform actions in the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-deactivate">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deactivatingUser && deactivateMutation.mutate(deactivatingUser.id)}
              data-testid="button-confirm-deactivate"
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
