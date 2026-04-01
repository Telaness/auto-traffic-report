"use client";

import { Suspense, useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        username,
        password,
        redirect: false,
      });

      if (result?.error) {
        const errorMsg = result.error;

        // レート制限エラー
        if (errorMsg.includes("RATE_LIMITED")) {
          const seconds = parseInt(errorMsg.split(":")[1] ?? "900", 10);
          const minutes = Math.ceil(seconds / 60);
          setError(`ログイン試行回数の上限に達しました。${minutes}分後に再試行してください。`);
          setIsLocked(true);
          return;
        }

        // 残り試行回数エラー
        if (errorMsg.includes("ATTEMPTS_REMAINING")) {
          const remaining = parseInt(errorMsg.split(":")[1] ?? "0", 10);
          setError(`ユーザー名またはパスワードが正しくありません（残り${remaining}回）`);
          return;
        }

        setError("ユーザー名またはパスワードが正しくありません");
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setError("ログインに失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-[#1a1a2e]">オトレポ</h1>
            <p className="text-sm text-gray-500 mt-1">auto-reportsHP</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className={`p-3 rounded-lg text-sm ${
                isLocked
                  ? "bg-red-100 text-red-800 border border-red-200"
                  : "bg-red-50 text-red-700"
              }`}>
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ユーザー名
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={isLocked}
                autoComplete="username"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a1a2e] focus:border-transparent outline-none disabled:bg-gray-100 disabled:text-gray-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                パスワード
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLocked}
                autoComplete="current-password"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a1a2e] focus:border-transparent outline-none disabled:bg-gray-100 disabled:text-gray-400"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || isLocked}
              className="w-full py-2.5 bg-[#1a1a2e] text-white rounded-lg hover:bg-[#16213e] transition-colors disabled:opacity-50 font-medium"
            >
              {isLocked ? "ロック中" : isLoading ? "ログイン中..." : "ログイン"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
