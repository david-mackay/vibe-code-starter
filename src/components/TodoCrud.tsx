"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Todo = {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
};

export function TodoCrud() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTitle, setNewTitle] = useState("");

  const sorted = useMemo(() => todos, [todos]);

  const fetchTodos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/todos", { cache: "no-store" });
      if (res.status === 401) {
        setTodos([]);
        setError("You are not authenticated.");
        return;
      }
      if (!res.ok && res.status !== 200) {
        // Handle DB not configured gracefully
        const data = await res.json().catch(() => ({}));
        if (res.status === 503 || data.error?.includes("Database")) {
          setTodos([]);
          setError(
            "Database not configured. Set up your database to use todos feature."
          );
          return;
        }
        throw new Error(`Failed to load todos (${res.status})`);
      }
      const data = (await res.json()) as { todos: Todo[]; error?: string };
      setTodos(Array.isArray(data.todos) ? data.todos : []);
      if (data.error) {
        setError(data.error);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load todos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchTodos();
  }, [fetchTodos]);

  const createTodo = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      const title = newTitle.trim();
      if (!title) return;
      setError(null);
      try {
        const res = await fetch("/api/todos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `Create failed (${res.status})`);
        }
        const data = (await res.json()) as { todo: Todo };
        if (data.todo) {
          setTodos((prev) => [data.todo, ...prev]);
          setNewTitle("");
        } else {
          await fetchTodos();
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Create failed");
      }
    },
    [newTitle, fetchTodos]
  );

  const toggleTodo = useCallback(async (todo: Todo) => {
    setError(null);
    const nextCompleted = !todo.completed;
    setTodos((prev) =>
      prev.map((t) => (t.id === todo.id ? { ...t, completed: nextCompleted } : t))
    );
    try {
      const res = await fetch(`/api/todos/${todo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: nextCompleted }),
      });
      if (!res.ok) {
        throw new Error(`Update failed (${res.status})`);
      }
      const data = (await res.json()) as { todo: Todo };
      if (data.todo) {
        setTodos((prev) => prev.map((t) => (t.id === todo.id ? data.todo : t)));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
      // revert on failure
      setTodos((prev) =>
        prev.map((t) => (t.id === todo.id ? { ...t, completed: todo.completed } : t))
      );
    }
  }, []);

  const renameTodo = useCallback(async (todo: Todo, title: string) => {
    const nextTitle = title.trim();
    if (!nextTitle || nextTitle === todo.title) return;
    setError(null);
    setTodos((prev) => prev.map((t) => (t.id === todo.id ? { ...t, title: nextTitle } : t)));
    try {
      const res = await fetch(`/api/todos/${todo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: nextTitle }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Update failed (${res.status})`);
      }
      const data = (await res.json()) as { todo: Todo };
      if (data.todo) {
        setTodos((prev) => prev.map((t) => (t.id === todo.id ? data.todo : t)));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
      setTodos((prev) => prev.map((t) => (t.id === todo.id ? todo : t)));
    }
  }, []);

  const deleteTodo = useCallback(async (todo: Todo) => {
    setError(null);
    setTodos((prev) => prev.filter((t) => t.id !== todo.id));
    try {
      const res = await fetch(`/api/todos/${todo.id}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error(`Delete failed (${res.status})`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
      await fetchTodos();
    }
  }, [fetchTodos]);

  return (
    <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">Starter CRUD (todos)</h2>
        <button
          className="px-3 py-1.5 text-xs rounded border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 disabled:opacity-50"
          onClick={fetchTodos}
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-200">
          {error}
        </div>
      )}

      <form onSubmit={createTodo} className="flex gap-2">
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Add a todo…"
          className="flex-1 px-3 py-2 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black text-sm"
        />
        <button
          type="submit"
          className="px-4 py-2 rounded bg-black text-white dark:bg-white dark:text-black text-sm font-medium disabled:opacity-50"
          disabled={loading || !newTitle.trim()}
        >
          Add
        </button>
      </form>

      <div className="space-y-2">
        {loading ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
        ) : sorted.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No todos yet.
          </p>
        ) : (
          sorted.map((todo) => (
            <div
              key={todo.id}
              className="flex items-center gap-2 rounded border border-zinc-200 dark:border-zinc-800 px-3 py-2"
            >
              <input
                type="checkbox"
                checked={todo.completed}
                onChange={() => void toggleTodo(todo)}
              />
              <input
                defaultValue={todo.title}
                onBlur={(e) => void renameTodo(todo, e.target.value)}
                className="flex-1 bg-transparent text-sm outline-none"
              />
              <button
                className="px-2 py-1 text-xs rounded border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                onClick={() => void deleteTodo(todo)}
              >
                Delete
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

