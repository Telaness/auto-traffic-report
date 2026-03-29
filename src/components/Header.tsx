"use client";

import { signOut } from "next-auth/react";

export const Header = () => {
  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8">
      <div />
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="px-4 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
      >
        ログアウト
      </button>
    </header>
  );
};
