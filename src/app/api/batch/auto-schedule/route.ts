import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";

export const GET = async () => {
  const setting = await prisma.systemSetting.findUnique({
    where: { key: "auto_batch_enabled" },
  });

  return NextResponse.json({
    enabled: setting?.value === "true",
  });
};

export const PUT = async (request: Request) => {
  const body = await request.json();
  const { enabled } = body as { enabled: boolean };

  await prisma.systemSetting.upsert({
    where: { key: "auto_batch_enabled" },
    update: { value: String(enabled) },
    create: { key: "auto_batch_enabled", value: String(enabled) },
  });

  return NextResponse.json({ enabled });
};
