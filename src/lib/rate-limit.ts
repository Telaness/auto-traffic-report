const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15分

interface AttemptRecord {
  count: number;
  firstAttempt: number;
  lockedUntil: number | null;
}

const attempts = new Map<string, AttemptRecord>();

// 古いエントリを定期的にクリーンアップ
const cleanup = () => {
  const now = Date.now();
  for (const [key, record] of attempts.entries()) {
    if (record.lockedUntil && now > record.lockedUntil) {
      attempts.delete(key);
    } else if (!record.lockedUntil && now - record.firstAttempt > LOCKOUT_DURATION_MS) {
      attempts.delete(key);
    }
  }
};

setInterval(cleanup, 60 * 1000);

export const checkRateLimit = (
  identifier: string
): { allowed: boolean; remainingAttempts: number; retryAfterSeconds: number } => {
  const now = Date.now();
  const record = attempts.get(identifier);

  // レコードなし → 初回
  if (!record) {
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS, retryAfterSeconds: 0 };
  }

  // ロック中
  if (record.lockedUntil) {
    if (now < record.lockedUntil) {
      const retryAfterSeconds = Math.ceil((record.lockedUntil - now) / 1000);
      return { allowed: false, remainingAttempts: 0, retryAfterSeconds };
    }
    // ロック期限切れ → リセット
    attempts.delete(identifier);
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS, retryAfterSeconds: 0 };
  }

  const remaining = MAX_ATTEMPTS - record.count;
  return { allowed: remaining > 0, remainingAttempts: Math.max(0, remaining), retryAfterSeconds: 0 };
};

export const recordFailedAttempt = (identifier: string): void => {
  const now = Date.now();
  const record = attempts.get(identifier);

  if (!record) {
    attempts.set(identifier, { count: 1, firstAttempt: now, lockedUntil: null });
    return;
  }

  record.count++;

  if (record.count >= MAX_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_DURATION_MS;
  }
};

export const resetAttempts = (identifier: string): void => {
  attempts.delete(identifier);
};
