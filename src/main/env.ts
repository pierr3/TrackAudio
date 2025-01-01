import { z } from 'zod';

const booleanTransformer = (v: string, ctx: z.RefinementCtx): boolean => {
  v = v.toLowerCase();
  switch (v) {
    case 'true':
      return true;
    case 'false':
      return false;
    default:
      ctx.addIssue({
        code: z.ZodIssueCode.invalid_type,
        expected: z.ZodParsedType.boolean,
        received: z.ZodParsedType.string,
        message: 'Expected "true" or "false"'
      });
      return false;
  }
};

const envSchema = z.object({
  VITE_AFV_URL: z.string().url(),
  VITE_DEBUG_CALLSIGN: z.string(),
  VITE_DEBUG_CID: z.string(),
  VITE_DEBUG_FREQ: z.string().transform((val) => parseInt(val, 10)),
  VITE_DEBUG_LAT: z.string().transform((val) => parseFloat(val)),
  VITE_DEBUG_LON: z.string().transform((val) => parseFloat(val)),
  VITE_DEBUG_IS_ATC: z.string().transform<boolean>(booleanTransformer).default('false')
});

export const ENV = envSchema.parse(import.meta.env);

// Export the type for use elsewhere
export type EnvConfig = z.infer<typeof envSchema>;
