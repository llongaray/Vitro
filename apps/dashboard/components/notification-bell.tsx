"use client";

import { Bell } from "lucide-react";
import { useEffect, useState } from "react";

import { api } from "@/lib/api";

type Notice = { id: string; title: string; body: string; read_at: string | null };

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<Notice[]>([]);

  async function load() {
    const response = await api("/notifications");
    if (!response.ok) return;
    const data = await response.json();
    setUnread(data.unread);
    setItems(data.items);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="relative">
      <button
        type="button"
        data-testid="notification-bell"
        className="relative text-xs text-stone-300"
        onClick={() => {
          setOpen((current) => !current);
          load();
        }}
      >
        <Bell size={16} />
        {unread ? <span className="absolute -right-2 -top-2 rounded-full bg-white px-1 text-[10px] text-stone-900">{unread}</span> : null}
      </button>
      {open ? (
        <div data-testid="notification-list" className="absolute right-0 z-10 mt-2 w-72 rounded-2xl bg-white p-3 text-stone-900 shadow-lg">
          {items.length ? (
            <ul className="space-y-2">
              {items.map((item) => (
                <li key={item.id} data-testid="notification-item" className="text-sm">
                  <p className="font-medium">{item.title}</p>
                  <p className="text-stone-600">{item.body}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-stone-500">Nenhum aviso.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
