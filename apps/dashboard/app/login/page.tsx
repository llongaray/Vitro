"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Input } from "@vitrio/ui";
import { readError, setAccessToken } from "@/lib/api";

const schema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(8, "Mínimo de 8 caracteres"),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } });

  async function onSubmit(values: FormValues) {
    const response = await fetch("/api/v1/auth/login", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!response.ok) {
      form.setError("root", { message: await readError(response) });
      return;
    }
    const body = await response.json();
    setAccessToken(body.access_token);
    router.replace("/");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <h1 className="text-3xl font-semibold">Entrar na loja</h1>
      <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 grid gap-4">
        <label>
          E-mail
          <Input data-testid="login-email" type="email" {...form.register("email")} />
        </label>
        <label>
          Senha
          <Input data-testid="login-password" type="password" {...form.register("password")} />
        </label>
        {form.formState.errors.root ? <p className="text-sm text-red-700">{form.formState.errors.root.message}</p> : null}
        {form.formState.errors.email ? <p className="text-sm text-red-700">{form.formState.errors.email.message}</p> : null}
        <button data-testid="login-submit" className="rounded-full bg-stone-900 px-4 py-2 text-stone-50" type="submit">
          Entrar
        </button>
      </form>
    </main>
  );
}
