// @ts-nocheck — skill asset: reference implementation; delete this line when copying it into the app
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
import { type Project, ProjectCreateSchema, ProjectUpdateSchema } from "@cen/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { type Control, Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";

const projectsQueryKey = ["projects"] as const;
const projectHeaders = [
  { key: "name", header: "Name" },
  { key: "description", header: "Description" },
  { key: "created", header: "Created" },
  { key: "actions", header: "Actions" },
] satisfies DataTableHeader[];
const skeletonRowIds = [
  "project-skeleton-1",
  "project-skeleton-2",
  "project-skeleton-3",
  "project-skeleton-4",
];

type ProjectCreateInput = z.input<typeof ProjectCreateSchema>;
type ProjectCreateOutput = z.output<typeof ProjectCreateSchema>;
type ProjectUpdateInput = z.input<typeof ProjectUpdateSchema>;
type ProjectUpdateOutput = z.output<typeof ProjectUpdateSchema>;
type ProjectRow = {
  id: string;
  name: string;
  description: string;
  created: string;
  actions: string;
};

export const Route = createFileRoute("/_layout/projects")({
  component: ProjectsPage,
});

function ProjectsPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const projectsQuery = useQuery({
    queryKey: projectsQueryKey,
    queryFn: listProjects,
  });
  const deleteMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: projectsQueryKey });
      setDeleteTarget(null);
      toast.success("Project deleted");
    },
    onError: (error) => toast.error(errorMessage(error, "Could not delete project")),
  });

  const projects = projectsQuery.data ?? [];
  const projectById = new Map(projects.map((project) => [project.id, project]));
  const rows = projects.map(toProjectRow);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="cds--type-heading-05">Projects</h1>
      <DataTable rows={rows} headers={projectHeaders} size="lg">
        {({
          rows: tableRows,
          headers,
          getHeaderProps,
          getRowProps,
          getTableProps,
          getCellProps,
        }) => (
          <TableContainer title="All projects">
            <TableToolbar>
              <TableToolbarContent>
                <Button renderIcon={Add} onClick={() => setCreateOpen(true)}>
                  New project
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
                {projectsQuery.isPending ? <ProjectSkeletonRows /> : null}
                {projectsQuery.isError ? (
                  <TableRow>
                    <TableCell
                      colSpan={headers.length}
                      className="py-8 text-center text-support-error"
                    >
                      {projectsQuery.error.message}
                    </TableCell>
                  </TableRow>
                ) : null}
                {!projectsQuery.isPending && !projectsQuery.isError && tableRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={headers.length}>
                      <div className="py-8 text-center text-text-secondary">
                        <p>No projects yet</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : null}
                {!projectsQuery.isPending && !projectsQuery.isError
                  ? tableRows.map((row) => {
                      const project = projectById.get(row.id);
                      if (!project) {
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
                                      aria-label={`Actions for ${project.name}`}
                                      flipped
                                      renderIcon={OverflowMenuVertical}
                                      size="sm"
                                    >
                                      <OverflowMenuItem
                                        itemText="Edit"
                                        onClick={() => setEditingProject(project)}
                                      />
                                      <OverflowMenuItem
                                        itemText="Delete"
                                        isDelete
                                        disabled={deleteMutation.isPending}
                                        onClick={() => setDeleteTarget(project)}
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
      <CreateProjectModal open={createOpen} onOpenChange={setCreateOpen} />
      <EditProjectModal project={editingProject} onClose={() => setEditingProject(null)} />
      <DeleteProjectModal
        project={deleteTarget}
        isDeleting={deleteMutation.isPending}
        onClose={() => setDeleteTarget(null)}
        onDelete={(id) => deleteMutation.mutate(id)}
      />
    </div>
  );
}

function CreateProjectModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const form = useForm<ProjectCreateInput, unknown, ProjectCreateOutput>({
    resolver: zodResolver(ProjectCreateSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });
  const createMutation = useMutation({
    mutationFn: createProject,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: projectsQueryKey });
      form.reset({ name: "", description: "" });
      onOpenChange(false);
      toast.success("Project created");
    },
    onError: (error) => toast.error(errorMessage(error, "Could not create project")),
  });

  function onSubmit(values: ProjectCreateOutput) {
    createMutation.mutate({
      name: values.name,
      description: normalizeDescription(values.description),
    });
  }

  return (
    <Modal
      open={open}
      modalHeading="Create project"
      primaryButtonText="Create"
      secondaryButtonText="Cancel"
      onRequestClose={() => onOpenChange(false)}
      onRequestSubmit={() => void form.handleSubmit(onSubmit)()}
      primaryButtonDisabled={createMutation.isPending}
      loadingStatus={createMutation.isPending ? "active" : "inactive"}
      loadingDescription="Creating project"
    >
      <Form onSubmit={form.handleSubmit(onSubmit)}>
        <Stack gap={6}>
          <CreateProjectFields control={form.control} />
        </Stack>
      </Form>
    </Modal>
  );
}

function EditProjectModal({ project, onClose }: { project: Project | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const form = useForm<ProjectUpdateInput, unknown, ProjectUpdateOutput>({
    resolver: zodResolver(ProjectUpdateSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });
  const updateMutation = useMutation({
    mutationFn: updateProject,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: projectsQueryKey });
      onClose();
      toast.success("Project updated");
    },
    onError: (error) => toast.error(errorMessage(error, "Could not update project")),
  });

  useEffect(() => {
    if (project) {
      form.reset({
        name: project.name,
        description: project.description ?? "",
      });
    }
  }, [form, project]);

  function onSubmit(values: ProjectUpdateOutput) {
    if (!project) {
      return;
    }

    updateMutation.mutate({
      id: project.id,
      values: {
        name: values.name,
        description: normalizeDescription(values.description),
      },
    });
  }

  return (
    <Modal
      open={!!project}
      modalHeading="Edit project"
      primaryButtonText="Save"
      secondaryButtonText="Cancel"
      onRequestClose={onClose}
      onRequestSubmit={() => void form.handleSubmit(onSubmit)()}
      primaryButtonDisabled={updateMutation.isPending}
      loadingStatus={updateMutation.isPending ? "active" : "inactive"}
      loadingDescription="Saving project"
    >
      <Form onSubmit={form.handleSubmit(onSubmit)}>
        <Stack gap={6}>
          <EditProjectFields control={form.control} />
        </Stack>
      </Form>
    </Modal>
  );
}

function DeleteProjectModal({
  project,
  isDeleting,
  onClose,
  onDelete,
}: {
  project: Project | null;
  isDeleting: boolean;
  onClose: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <Modal
      open={!!project}
      danger
      modalHeading="Delete project"
      primaryButtonText="Delete"
      secondaryButtonText="Cancel"
      onRequestClose={onClose}
      onRequestSubmit={() => {
        if (project) {
          onDelete(project.id);
        }
      }}
      primaryButtonDisabled={isDeleting}
      loadingStatus={isDeleting ? "active" : "inactive"}
      loadingDescription="Deleting project"
    >
      <p className="cds--type-body-01 text-text-secondary">
        Delete {project ? `"${project.name}"` : "this project"}?
      </p>
    </Modal>
  );
}

function CreateProjectFields({
  control,
}: {
  control: Control<ProjectCreateInput, unknown, ProjectCreateOutput>;
}) {
  return (
    <>
      <Controller
        control={control}
        name="name"
        render={({ field, fieldState }) => (
          <TextInput
            {...field}
            id="create-project-name"
            value={field.value ?? ""}
            labelText="Name"
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
            id="create-project-description"
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

function EditProjectFields({
  control,
}: {
  control: Control<ProjectUpdateInput, unknown, ProjectUpdateOutput>;
}) {
  return (
    <>
      <Controller
        control={control}
        name="name"
        render={({ field, fieldState }) => (
          <TextInput
            {...field}
            id="edit-project-name"
            value={field.value ?? ""}
            labelText="Name"
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
            id="edit-project-description"
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

function ProjectSkeletonRows() {
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

async function listProjects() {
  const response = await api.projects.$get({ query: { limit: 100, offset: 0 } });

  if (!response.ok) {
    throw new Error(`Could not load projects (${response.status})`);
  }

  return response.json();
}

async function createProject(values: ProjectCreateOutput) {
  const response = await api.projects.$post({ json: values });

  if (!response.ok) {
    throw new Error(`Could not create project (${response.status})`);
  }

  return response.json();
}

async function updateProject({ id, values }: { id: string; values: ProjectUpdateOutput }) {
  const response = await api.projects[":id"].$patch({ param: { id }, json: values });

  if (!response.ok) {
    throw new Error(`Could not update project (${response.status})`);
  }

  return response.json();
}

async function deleteProject(id: string) {
  const response = await api.projects[":id"].$delete({ param: { id } });

  if (!response.ok) {
    throw new Error(`Could not delete project (${response.status})`);
  }
}

function toProjectRow(project: Project): ProjectRow {
  return {
    id: project.id,
    name: project.name,
    description: project.description || "No description",
    created: formatDate(project.createdAt),
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
