import { z } from "zod";
import type { Context } from "hono";

export const sourceQuerySchema = z.object({
  source: z.enum(["all", "omscentral", "app"]).default("all"),
  includeDeleted: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true"),
});

export const reviewBodySchema = z.object({
  semester: z.string().trim().min(1).max(64).default("Unspecified"),
  difficulty: z.number().int().min(1).max(5),
  workload: z.number().min(0).max(80),
  rating: z.number().int().min(1).max(5),
  recommend: z.boolean(),
  programStage: z.enum(["First", "Mid", "Late"]),
  body: z.string().trim().min(20, "Review must be at least 20 characters.").max(8000),
});

export type ReviewBodyInput = z.infer<typeof reviewBodySchema>;

type ValidationFailure = {
  success: false;
  error: {
    issues: {
      path: PropertyKey[];
      message: string;
    }[];
  };
};

export function validationErrorResponse(result: ValidationFailure, c: Context) {
  const issues = result.error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));

  return c.json(
    {
      error: "Invalid request.",
      issues,
    },
    400,
  );
}
