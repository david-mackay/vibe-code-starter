import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { requireAuthenticatedUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { todos } from "@/server/db/schema";

export const runtime = "nodejs";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthenticatedUser();
    const { id } = await context.params;

    const body = (await req.json()) as {
      title?: unknown;
      completed?: unknown;
    };

    const updates: { title?: string; completed?: boolean; updatedAt: Date } = {
      updatedAt: new Date(),
    };

    if (typeof body.title === "string") {
      const nextTitle = body.title.trim();
      if (!nextTitle) {
        return NextResponse.json(
          { error: "Title cannot be empty" },
          { status: 400 }
        );
      }
      updates.title = nextTitle;
    }

    if (typeof body.completed === "boolean") {
      updates.completed = body.completed;
    }

    const updated = await db
      .update(todos)
      .set(updates)
      .where(and(eq(todos.id, id), eq(todos.userId, user.id)))
      .returning()
      .then((rows) => rows[0]);

    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ todo: updated });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "DATABASE_NOT_AVAILABLE") {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 503 }
      );
    }
    console.error("/api/todos/[id] PATCH error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthenticatedUser();
    const { id } = await context.params;

    const deleted = await db
      .delete(todos)
      .where(and(eq(todos.id, id), eq(todos.userId, user.id)))
      .returning({ id: todos.id })
      .then((rows) => rows[0]);

    if (!deleted) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "DATABASE_NOT_AVAILABLE") {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 503 }
      );
    }
    console.error("/api/todos/[id] DELETE error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

