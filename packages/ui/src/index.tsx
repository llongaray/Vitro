import { ButtonHTMLAttributes, InputHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "primary" | "secondary" };

export function Button({ className = "", tone = "primary", ...props }: ButtonProps) {
  const tones = {
    primary: "bg-[var(--brand,#245b45)] text-[var(--surface,white)]",
    secondary: "bg-[var(--soft,#e5ede5)] text-[var(--brand,#245b45)]",
  };
  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center rounded-[10px] px-3.5 py-3.5 text-[15px] font-normal transition disabled:cursor-not-allowed disabled:opacity-50 ${tones[tone]} ${className}`}
      {...props}
    />
  );
}

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-lg bg-[var(--bg,#f4efe7)] px-3.5 py-3.5 text-[15px] text-[var(--ink,#1c2924)] outline-none ring-[var(--brand,#245b45)] placeholder:text-[var(--muted,#64736b)] focus:ring-2 ${className}`}
      {...props}
    />
  );
}
