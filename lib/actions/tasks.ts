"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { taskSchema, type TaskFormValues } from "@/lib/schemas";
import type { ActionResult } from "@/lib/actions/applications";
import {
  IS_DEMO,
  demoCreateTask,
  demoToggleTask,
  demoDeleteTask,
} from "@/lib/demo";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, userId: user.id };
}

function revalidateTasks(applicationId?: string | null) {
  revalidatePath("/tasks");
  revalidatePath("/applications");
  if (applicationId) revalidatePath(`/applications/${applicationId}`);
}

export async function createTask(
  values: TaskFormValues,
): Promise<ActionResult<{ id: string }>> {
  const parsed = taskSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
  }

  if (IS_DEMO) {
    const { id } = demoCreateTask(values);
    revalidateTasks(parsed.data.application_id || null);
    return { ok: true, data: { id } };
  }

  const { supabase, userId } = await requireUser();
  const applicationId = parsed.data.application_id || null;

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      user_id: userId,
      application_id: applicationId,
      title: parsed.data.title,
      description: parsed.data.description || null,
      due_date: parsed.data.due_date || null,
      priority: parsed.data.priority,
      status: "todo",
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidateTasks(applicationId);
  return { ok: true, data: { id: data.id } };
}

export async function toggleTask(
  id: string,
  done: boolean,
): Promise<ActionResult> {
  if (IS_DEMO) {
    demoToggleTask(id, done);
    revalidateTasks();
    return { ok: true };
  }
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("tasks")
    .update({ status: done ? "done" : "todo" })
    .eq("id", id)
    .select("application_id")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidateTasks(data?.application_id);
  return { ok: true };
}

export async function deleteTask(id: string): Promise<ActionResult> {
  if (IS_DEMO) {
    demoDeleteTask(id);
    revalidateTasks();
    return { ok: true };
  }
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", id)
    .select("application_id")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidateTasks(data?.application_id);
  return { ok: true };
}
