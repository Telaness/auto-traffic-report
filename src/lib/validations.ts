import { z } from "zod/v4";

export const clientCreateSchema = z.object({
  name: z.string().min(1, "会社名は必須です"),
  contactEmail: z.email("有効なメールアドレスを入力してください").optional().nullable(),
  lineUserId: z.string().optional().nullable(),
  deliveryChannel: z.enum(["email", "line", "both"]),
});

export const clientUpdateSchema = clientCreateSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const siteCreateSchema = z.object({
  clientId: z.uuid("有効なクライアントIDを指定してください"),
  siteName: z.string().min(1, "サイト名は必須です"),
  siteUrl: z.url("有効なURLを入力してください"),
  ga4PropertyId: z.string().min(1, "GA4プロパティIDは必須です"),
  reportStartDate: z.string().min(1, "レポート開始日は必須です"),
});

export const siteUpdateSchema = siteCreateSchema.partial();


export const batchSubscriptionCreateSchema = z.object({
  clientId: z.uuid("有効なクライアントIDを指定してください"),
  deliveryChannel: z.enum(["email", "line", "both"]),
});

export const batchSubscriptionUpdateSchema = z.object({
  deliveryChannel: z.enum(["email", "line", "both"]).optional(),
  isActive: z.boolean().optional(),
});

export type BatchSubscriptionCreateInput = z.infer<typeof batchSubscriptionCreateSchema>;
export type BatchSubscriptionUpdateInput = z.infer<typeof batchSubscriptionUpdateSchema>;

export type ClientCreateInput = z.infer<typeof clientCreateSchema>;
export type ClientUpdateInput = z.infer<typeof clientUpdateSchema>;
export type SiteCreateInput = z.infer<typeof siteCreateSchema>;
export type SiteUpdateInput = z.infer<typeof siteUpdateSchema>;
