import { NextResponse } from "next/server";

export const apiError = (
  message: string,
  status: number
): NextResponse => {
  return NextResponse.json({ error: message }, { status });
};

export const apiServerError = (
  error: unknown,
  fallbackMessage: string
): NextResponse => {
  const message =
    process.env.NODE_ENV === "development" && error instanceof Error
      ? error.message
      : fallbackMessage;

  if (error instanceof Error) {
    console.error(`[API Error] ${fallbackMessage}:`, error.message);
  }

  return NextResponse.json({ error: message }, { status: 500 });
};
