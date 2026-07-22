// @ts-nocheck — template overlay; this line is stripped when `pnpm flavor apply` copies the file into place
import { Add, OverflowMenuVertical } from "@carbon/icons-react";
import type { DataTableHeader } from "@carbon/react";
import {
  Button,
  DataTable,
  Form,
  Modal,
  OverflowMenu,
  OverflowMenuItem,
  SkeletonText,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  TableToolbar,
  TableToolbarContent,
  TextArea,
  TextInput,
} from "@carbon/react";
import { type Item, ItemCreateSchema, ItemUpdateSchema } from "@cen/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { type Control, Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";

const itemsQueryKey = ["items"] as const;
const itemHeaders = [
  { key: "title", header: "Title" },
  { key: "description", header: "Description" },
  { key: "created", header: "Created" },
  { key: "actions", header: "Actions" },
] satisfies DataTableHeader[];
const skeletonRowIds = ["item-skeleton-1", "item-skeleton-2", "item-skeleton-3", "item-skeleton-4"];

type ItemCreateInput = z.input<typeof ItemCreateSchema>;
type ItemCreateOutput = z.output<typeof ItemCreateSchema>;
type ItemUpdateInput = z.input<typeof ItemUpdateSchema>;
type ItemUpdateOutput = z.output<typeof ItemUpdateSchema>;
type ItemRow = {
  id: string;
  title: string;
  description: string;
  created: string;
  actions: string;
};

export const Route = createFileRoute("/_layout/items")({
  component: ItemsPage,
});

function ItemsPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Item | null>(null);
  const itemsQuery = useQuery({
    queryKey: itemsQueryKey,
    queryFn: listItems,
  });
  const deleteMutation = useMutation({
    mutationFn: deleteItem,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: itemsQueryKey });
      setDeleteTarget(null);
      toast.success("Item deleted");
    },
    onError: (error) => toast.error(errorMessage(error, "Could not delete item")),
  });

  const items = itemsQuery.data ?? [];
  const itemById = new Map(items.map((item) => [item.id, item]));
  const rows = items.map(toItemRow);

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-2">
        <h1 className="cds--type-heading-05">Items</h1>
        <p className="cds--type-body-01 text-text-secondary">
          A typed CRUD resource backed by Hono and Drizzle.
        </p>
      </div>
      <DataTable rows={rows} headers={itemHeaders} size="lg">
        {({
          rows: tableRows,
          headers,
          getHeaderProps,
          getRowProps,
          getTableProps,
          getCellProps,
        }) => (
          <TableContainer
            title="All items"
            description="Create, edit, and delete records owned by signed-in users."
          >
            <TableToolbar>
              <TableToolbarContent>
                <Button renderIcon={Add} onClick={() => setCreateOpen(true)}>
                  New item
                </Button>
              </TableToolbarContent>
            </TableToolbar>
            <Table {...getTableProps()}>
              <TableHead>
                <TableRow>
                  {headers.map((header) => {
                    const { key, ...headerProps } = getHeaderProps({ header });
                    return (
                      <TableHeader key={key} {...headerProps}>
                        {header.header}
                      </TableHeader>
                    );
                  })}
                </TableRow>
              </TableHead>
              <TableBody>
                {itemsQuery.isPending ? <ItemSkeletonRows /> : null}
                {itemsQuery.isError ? (
                  <TableRow>
                    <TableCell
                      colSpan={headers.length}
                      className="py-8 text-center text-support-error"
                    >
                      {itemsQuery.error.message}
                    </TableCell>
                  </TableRow>
                ) : null}
                {!itemsQuery.isPending && !itemsQuery.isError && tableRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={headers.length}>
                      <div className="py-8 text-center text-text-secondary">
                        <p>No items yet</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : null}
                {!itemsQuery.isPending && !itemsQuery.isError
                  ? tableRows.map((row) => {
                      const item = itemById.get(row.id);
                      if (!item) {
                        return null;
                      }

                      const { key, ...rowProps } = getRowProps({ row });
                      return (
                        <TableRow key={key} {...rowProps}>
                          {row.cells.map((cell) => {
                            const { key: cellKey, ...cellProps } = getCellProps({ cell });

                            if (cell.info.header === "actions") {
                              return (
                                <TableCell key={cellKey} {...cellProps}>
                                  <div className="flex justify-end">
                                    <OverflowMenu
                                      aria-label={`Actions for ${item.title}`}
                                      flipped
                                      renderIcon={OverflowMenuVertical}
                                      size="sm"
                                    >
                                      <OverflowMenuItem
                                        itemText="Edit"
                                        onClick={() => setEditingItem(item)}
                                      />
                                      <OverflowMenuItem
                                        itemText="Delete"
                                        isDelete
                                        disabled={deleteMutation.isPending}
                                        onClick={() => setDeleteTarget(item)}
                                      />
                                    </OverflowMenu>
                                  </div>
                                </TableCell>
                              );
                            }

                            return (
                              <TableCell
                                key={cellKey}
                                {...cellProps}
                                className={
                                  cell.info.header === "description"
                                    ? "max-w-md truncate text-text-secondary"
                                    : undefined
                                }
                              >
                                {String(cell.value ?? "")}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      );
                    })
                  : null}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DataTable>
      <CreateItemModal open={createOpen} onOpenChange={setCreateOpen} />
      <EditItemModal item={editingItem} onClose={() => setEditingItem(null)} />
      <DeleteItemModal
        item={deleteTarget}
        isDeleting={deleteMutation.isPending}
        onClose={() => setDeleteTarget(null)}
        onDelete={(id) => deleteMutation.mutate(id)}
      />
    </div>
  );
}

function CreateItemModal({
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
    onError: (error) => toast.error(errorMessage(error, "Could not create item")),
  });

  function onSubmit(values: ItemCreateOutput) {
    createMutation.mutate({
      title: values.title,
      description: normalizeDescription(values.description),
    });
  }

  return (
    <Modal
      open={open}
      modalHeading="Create item"
      primaryButtonText="Create"
      secondaryButtonText="Cancel"
      onRequestClose={() => onOpenChange(false)}
      onRequestSubmit={() => void form.handleSubmit(onSubmit)()}
      primaryButtonDisabled={createMutation.isPending}
      loadingStatus={createMutation.isPending ? "active" : "inactive"}
      loadingDescription="Creating item"
    >
      <Form onSubmit={form.handleSubmit(onSubmit)}>
        <Stack gap={6}>
          <CreateItemFields control={form.control} />
        </Stack>
      </Form>
    </Modal>
  );
}

function EditItemModal({ item, onClose }: { item: Item | null; onClose: () => void }) {
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
    onError: (error) => toast.error(errorMessage(error, "Could not update item")),
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
    <Modal
      open={!!item}
      modalHeading="Edit item"
      primaryButtonText="Save"
      secondaryButtonText="Cancel"
      onRequestClose={onClose}
      onRequestSubmit={() => void form.handleSubmit(onSubmit)()}
      primaryButtonDisabled={updateMutation.isPending}
      loadingStatus={updateMutation.isPending ? "active" : "inactive"}
      loadingDescription="Saving item"
    >
      <Form onSubmit={form.handleSubmit(onSubmit)}>
        <Stack gap={6}>
          <EditItemFields control={form.control} />
        </Stack>
      </Form>
    </Modal>
  );
}

function DeleteItemModal({
  item,
  isDeleting,
  onClose,
  onDelete,
}: {
  item: Item | null;
  isDeleting: boolean;
  onClose: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <Modal
      open={!!item}
      danger
      modalHeading="Delete item"
      primaryButtonText="Delete"
      secondaryButtonText="Cancel"
      onRequestClose={onClose}
      onRequestSubmit={() => {
        if (item) {
          onDelete(item.id);
        }
      }}
      primaryButtonDisabled={isDeleting}
      loadingStatus={isDeleting ? "active" : "inactive"}
      loadingDescription="Deleting item"
    >
      <p className="cds--type-body-01 text-text-secondary">
        Delete {item ? `"${item.title}"` : "this item"}?
      </p>
    </Modal>
  );
}

function CreateItemFields({
  control,
}: {
  control: Control<ItemCreateInput, unknown, ItemCreateOutput>;
}) {
  return (
    <>
      <Controller
        control={control}
        name="title"
        render={({ field, fieldState }) => (
          <TextInput
            {...field}
            id="create-item-title"
            value={field.value ?? ""}
            labelText="Title"
            invalid={!!fieldState.error}
            invalidText={fieldState.error?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="description"
        render={({ field, fieldState }) => (
          <TextArea
            {...field}
            id="create-item-description"
            value={field.value ?? ""}
            labelText="Description"
            invalid={!!fieldState.error}
            invalidText={fieldState.error?.message}
          />
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
      <Controller
        control={control}
        name="title"
        render={({ field, fieldState }) => (
          <TextInput
            {...field}
            id="edit-item-title"
            value={field.value ?? ""}
            labelText="Title"
            invalid={!!fieldState.error}
            invalidText={fieldState.error?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="description"
        render={({ field, fieldState }) => (
          <TextArea
            {...field}
            id="edit-item-description"
            value={field.value ?? ""}
            labelText="Description"
            invalid={!!fieldState.error}
            invalidText={fieldState.error?.message}
          />
        )}
      />
    </>
  );
}

function ItemSkeletonRows() {
  return skeletonRowIds.map((id) => (
    <TableRow key={id}>
      <TableCell>
        <SkeletonText width="10rem" />
      </TableCell>
      <TableCell>
        <SkeletonText width="18rem" />
      </TableCell>
      <TableCell>
        <SkeletonText width="8rem" />
      </TableCell>
      <TableCell>
        <div className="flex justify-end">
          <SkeletonText width="2rem" />
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

function toItemRow(item: Item): ItemRow {
  return {
    id: item.id,
    title: item.title,
    description: item.description || "No description",
    created: formatDate(item.createdAt),
    actions: "",
  };
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
