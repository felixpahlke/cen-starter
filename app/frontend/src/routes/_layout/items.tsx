import { type Item, ItemCreateSchema, ItemUpdateSchema } from "@cen/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { type Control, useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";

const itemsQueryKey = ["items"] as const;

type ItemCreateInput = z.input<typeof ItemCreateSchema>;
type ItemCreateOutput = z.output<typeof ItemCreateSchema>;
type ItemUpdateInput = z.input<typeof ItemUpdateSchema>;
type ItemUpdateOutput = z.output<typeof ItemUpdateSchema>;

export const Route = createFileRoute("/_layout/items")({
  component: ItemsPage,
});

function ItemsPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const itemsQuery = useQuery({
    queryKey: itemsQueryKey,
    queryFn: listItems,
  });
  const deleteMutation = useMutation({
    mutationFn: deleteItem,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: itemsQueryKey });
      toast.success("Item deleted");
    },
    onError: (error) => toast.error(error.message),
  });

  function confirmDelete(item: Item) {
    if (!window.confirm(`Delete "${item.title}"?`)) {
      return;
    }

    deleteMutation.mutate(item.id);
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="font-semibold text-3xl tracking-tight">Items</h1>
          <p className="text-muted-foreground">A typed CRUD resource backed by Hono and Drizzle.</p>
        </div>
        <CreateItemDialog open={createOpen} onOpenChange={setCreateOpen} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All items</CardTitle>
          <CardDescription>
            Create, edit, and delete records owned by signed-in users.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-32 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itemsQuery.isPending ? <ItemSkeletonRows /> : null}
              {itemsQuery.isError ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-destructive">
                    {itemsQuery.error.message}
                  </TableCell>
                </TableRow>
              ) : null}
              {itemsQuery.data?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    No items yet
                  </TableCell>
                </TableRow>
              ) : null}
              {itemsQuery.data?.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.title}</TableCell>
                  <TableCell className="max-w-md truncate text-muted-foreground">
                    {item.description || "No description"}
                  </TableCell>
                  <TableCell>{formatDate(item.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setEditingItem(item)}>
                        <Pencil />
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => confirmDelete(item)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 />
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <EditItemDialog item={editingItem} onClose={() => setEditingItem(null)} />
    </div>
  );
}

function CreateItemDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const form = useForm<ItemCreateInput, unknown, ItemCreateOutput>({
    resolver: zodResolver(ItemCreateSchema),
    defaultValues: {
      title: "",
      description: "",
    },
  });
  const createMutation = useMutation({
    mutationFn: createItem,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: itemsQueryKey });
      form.reset({ title: "", description: "" });
      onOpenChange(false);
      toast.success("Item created");
    },
    onError: (error) => toast.error(error.message),
  });

  function onSubmit(values: ItemCreateOutput) {
    createMutation.mutate({
      title: values.title,
      description: normalizeDescription(values.description),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus />
          New item
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create item</DialogTitle>
          <DialogDescription>Add a record to the protected items resource.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <CreateItemFields control={form.control} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                Create
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function EditItemDialog({ item, onClose }: { item: Item | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const form = useForm<ItemUpdateInput, unknown, ItemUpdateOutput>({
    resolver: zodResolver(ItemUpdateSchema),
    defaultValues: {
      title: "",
      description: "",
    },
  });
  const updateMutation = useMutation({
    mutationFn: updateItem,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: itemsQueryKey });
      onClose();
      toast.success("Item updated");
    },
    onError: (error) => toast.error(error.message),
  });

  useEffect(() => {
    if (item) {
      form.reset({
        title: item.title,
        description: item.description ?? "",
      });
    }
  }, [form, item]);

  function onSubmit(values: ItemUpdateOutput) {
    if (!item) {
      return;
    }

    updateMutation.mutate({
      id: item.id,
      values: {
        title: values.title,
        description: normalizeDescription(values.description),
      },
    });
  }

  return (
    <Dialog open={!!item} onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit item</DialogTitle>
          <DialogDescription>Update the item fields stored by the API.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <EditItemFields control={form.control} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                Save
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function CreateItemFields({
  control,
}: {
  control: Control<ItemCreateInput, unknown, ItemCreateOutput>;
}) {
  return (
    <>
      <FormField
        control={control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Title</FormLabel>
            <FormControl>
              <Input {...field} value={field.value ?? ""} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Textarea {...field} value={field.value ?? ""} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}

function EditItemFields({
  control,
}: {
  control: Control<ItemUpdateInput, unknown, ItemUpdateOutput>;
}) {
  return (
    <>
      <FormField
        control={control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Title</FormLabel>
            <FormControl>
              <Input {...field} value={field.value ?? ""} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Textarea {...field} value={field.value ?? ""} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}

function ItemSkeletonRows() {
  return Array.from({ length: 4 }, (_, index) => (
    <TableRow key={index}>
      <TableCell>
        <Skeleton className="h-5 w-40" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-64" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-24" />
      </TableCell>
      <TableCell>
        <div className="flex justify-end gap-2">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-20" />
        </div>
      </TableCell>
    </TableRow>
  ));
}

async function listItems() {
  const response = await api.items.$get({ query: { limit: 100, offset: 0 } });

  if (!response.ok) {
    throw new Error(`Could not load items (${response.status})`);
  }

  return response.json();
}

async function createItem(values: ItemCreateOutput) {
  const response = await api.items.$post({ json: values });

  if (!response.ok) {
    throw new Error(`Could not create item (${response.status})`);
  }

  return response.json();
}

async function updateItem({ id, values }: { id: string; values: ItemUpdateOutput }) {
  const response = await api.items[":id"].$patch({ param: { id }, json: values });

  if (!response.ok) {
    throw new Error(`Could not update item (${response.status})`);
  }

  return response.json();
}

async function deleteItem(id: string) {
  const response = await api.items[":id"].$delete({ param: { id } });

  if (!response.ok) {
    throw new Error(`Could not delete item (${response.status})`);
  }
}

function normalizeDescription(value: string | null | undefined) {
  return value ? value : null;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
