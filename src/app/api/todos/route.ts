import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";

import { requireAuthenticatedUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { todos } from "@/server/db/schema";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await requireAuthenticatedUser();
    const rows = await db.query.todos.findMany({
      where: eq(todos.userId, user.id),
      orderBy: [desc(todos.createdAt)],
    });
    return NextResponse.json({ todos: rows });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "DATABASE_NOT_AVAILABLE") {
      // Database not configured or RLS blocking - return empty todos
      // This allows the app to work as a starter template
      return NextResponse.json({
        todos: [],
        error: "Database not configured. Configure your database to use todos feature.",
      });
    }
    console.error("/api/todos GET error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser();
    const body = (await req.json()) as { title?: unknown };
    const title =
      typeof body.title === "string" ? body.title.trim() : undefined;

    if (!title) {
      return NextResponse.json({ error: "Missing title" }, { status: 400 });
    }

    const created = await db
      .insert(todos)
      .values({
        userId: user.id,
        title,
      })
      .returning()
      .then((rows) => rows[0]);

    return NextResponse.json({ todo: created }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "DATABASE_NOT_AVAILABLE") {
      return NextResponse.json(
        {
          error:
            "Database not configured. Configure your database to create todos.",
        },
        { status: 503 }
      );
    }
    console.error("/api/todos POST error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

