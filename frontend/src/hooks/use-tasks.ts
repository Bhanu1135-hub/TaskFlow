import { useEffect, useState } from "react";
import { toast } from "sonner";
import { apiRequest } from "@/lib/api";

export type TaskPriority = "High" | "Medium" | "Low";
export type TaskStatus = "Todo" | "In progress" | "Done";

export type Task = {
  id: string;
  title: string;
  project: string;
  owner: string;
  priority: TaskPriority;
  status: TaskStatus;
  due: string;
};

const demoTasks: Task[] = [
  { id: "demo-1", title: "Finalize onboarding flow", project: "Website redesign", owner: "You", priority: "High", status: "In progress", due: "Today" },
  { id: "demo-2", title: "Review API error states", project: "Mobile app v2", owner: "You", priority: "High", status: "Todo", due: "Tomorrow" },
  { id: "demo-3", title: "Prepare stakeholder demo", project: "Q4 launch plan", owner: "You", priority: "Medium", status: "Todo", due: "Oct 02" },
  { id: "demo-4", title: "Update empty state copy", project: "Website redesign", owner: "You", priority: "Low", status: "Done", due: "Sep 28" },
  { id: "demo-5", title: "Map billing permissions", project: "Platform", owner: "You", priority: "Medium", status: "In progress", due: "Oct 04" },
];

export function useTasks(userId: string | null) {
  const [tasks, setTasks] = useState<Task[]>(() => userId ? [] : demoTasks);
  const [tasksLoading, setTasksLoading] = useState(Boolean(userId));

  useEffect(() => {
    if (!userId) return;

    let active = true;
    setTasksLoading(true);

    async function loadTasks() {
      try {
        const data = await apiRequest<Task[]>("/api/tasks");
        if (active) setTasks(data);
      } catch (error) {
        if (active) {
          toast.error(`Could not load tasks: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      } finally {
        if (active) setTasksLoading(false);
      }
    }

    void loadTasks();
    return () => {
      active = false;
    };
  }, [userId]);

  async function toggleTask(id: string) {
    const currentTask = tasks.find((task) => task.id === id);
    if (!currentTask) return;

    const status: TaskStatus = currentTask.status === "Done" ? "In progress" : "Done";
    if (!userId) {
      setTasks((current) => current.map((task) => task.id === id ? { ...task, status } : task));
      toast.success("Demo task updated. Sign in to save changes.");
      return;
    }

    try {
      const updatedTask = await apiRequest<Task>(`/api/tasks/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setTasks((current) => current.map((task) => task.id === id ? updatedTask : task));
      toast.success("Task status updated");
    } catch (error) {
      toast.error(`Could not update task: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  async function createTask(title: string): Promise<Task | null> {
    if (!userId) {
      const task: Task = {
        id: `demo-${Date.now()}`,
        title,
        project: "Inbox",
        owner: "You",
        priority: "Medium",
        status: "Todo",
        due: "Today",
      };
      setTasks((current) => [task, ...current]);
      toast.success("Demo task added. Sign in to save it.");
      return task;
    }

    try {
      const task = await apiRequest<Task>("/api/tasks", {
        method: "POST",
        body: JSON.stringify({ title }),
      });
      setTasks((current) => [task, ...current]);
      toast.success("Task added to Inbox");
      return task;
    } catch (error) {
      toast.error(`Could not create task: ${error instanceof Error ? error.message : "Unknown error"}`);
      return null;
    }
  }

  return { tasks, tasksLoading, toggleTask, createTask };
}
