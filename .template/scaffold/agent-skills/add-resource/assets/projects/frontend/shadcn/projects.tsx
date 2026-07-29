// @ts-nocheck — skill asset: reference implementation; delete this line when copying it into the app
import { type Project, ProjectCreateSchema, ProjectUpdateSchema } from "@cen/shared";
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

const projectsQueryKey = ["projects"] as const;

type ProjectCreateInput = z.input<typeof ProjectCreateSchema>;
type ProjectCreateOutput = z.output<typeof ProjectCreateSchema>;
type ProjectUpdateInput = z.input<typeof ProjectUpdateSchema>;
type ProjectUpdateOutput = z.output<typeof ProjectUpdateSchema>;

export const Route = createFileRoute("/_layout/projects")({
  component: ProjectsPage,
});

function ProjectsPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const projectsQuery = useQuery({
    queryKey: projectsQueryKey,
    queryFn: listProjects,
  });
  const deleteMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: projectsQueryKey });
      toast.success("Project deleted");
    },
    onError: (error) => toast.error(error.message),
  });

  function confirmDelete(project: Project) {
    if (!window.confirm(`Delete "${project.name}"?`)) {
      return;
    }

    deleteMutation.mutate(project.id);
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="font-semibold text-3xl tracking-tight">Projects</h1>
          <p className="text-muted-foreground">Create, edit, and delete your projects.</p>
        </div>
        <CreateProjectDialog open={createOpen} onOpenChange={setCreateOpen} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All projects</CardTitle>
          <CardDescription>Records owned by the signed-in user.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-32 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projectsQuery.isPending ? <ProjectSkeletonRows /> : null}
              {projectsQuery.isError ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-destructive">
                    {projectsQuery.error.message}
                  </TableCell>
                </TableRow>
              ) : null}
              {projectsQuery.data?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    No projects yet
                  </TableCell>
                </TableRow>
              ) : null}
              {projectsQuery.data?.map((project) => (
                <TableRow key={project.id}>
                  <TableCell className="font-medium">{project.name}</TableCell>
                  <TableCell className="max-w-md truncate text-muted-foreground">
                    {project.description || "No description"}
                  </TableCell>
                  <TableCell>{formatDate(project.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingProject(project)}
                      >
                        <Pencil />
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => confirmDelete(project)}
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
      <EditProjectDialog project={editingProject} onClose={() => setEditingProject(null)} />
    </div>
  );
}

function CreateProjectDialog({
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
    onError: (error) => toast.error(error.message),
  });

  function onSubmit(values: ProjectCreateOutput) {
    createMutation.mutate({
      name: values.name,
      description: normalizeDescription(values.description),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus />
          New project
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create project</DialogTitle>
          <DialogDescription>Add a project owned by your account.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <CreateProjectFields control={form.control} />
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

function EditProjectDialog({ project, onClose }: { project: Project | null; onClose: () => void }) {
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
    onError: (error) => toast.error(error.message),
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
    <Dialog open={!!project} onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit project</DialogTitle>
          <DialogDescription>Update the project fields stored by the API.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <EditProjectFields control={form.control} />
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

function CreateProjectFields({
  control,
}: {
  control: Control<ProjectCreateInput, unknown, ProjectCreateOutput>;
}) {
  return (
    <>
      <FormField
        control={control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Name</FormLabel>
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

function EditProjectFields({
  control,
}: {
  control: Control<ProjectUpdateInput, unknown, ProjectUpdateOutput>;
}) {
  return (
    <>
      <FormField
        control={control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Name</FormLabel>
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

function ProjectSkeletonRows() {
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

function normalizeDescription(value: string | null | undefined) {
  return value ? value : null;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
