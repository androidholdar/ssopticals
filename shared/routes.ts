import { z } from 'zod';
import { 
  insertCategorySchema, 
  insertCustomerSchema, 
  insertFormPresetSchema, 
  insertFormPresetFieldSchema,
  categories,
  customers,
  formPresets,
  formPresetFields,
  settings
} from './schema';

export * from './schema';

// Error Schemas
export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  })
};

// API Definition
export const api = {
  settings: {
    get: {
      method: 'GET' as const,
      path: '/api/settings',
      responses: {
        200: z.object({
          hasPassword: z.boolean(),
          hasMasterPassword: z.boolean(),
        }),
      },
    },
    setup: {
      method: 'POST' as const,
      path: '/api/settings/setup',
      input: z.object({ password: z.string().min(1) }),
      responses: {
        200: z.object({ success: z.boolean() }),
      },
    },
    verify: {
      method: 'POST' as const,
      path: '/api/settings/verify',
      input: z.object({ password: z.string() }),
      responses: {
        200: z.object({ valid: z.boolean() }),
      },
    },
    changePassword: {
      method: 'POST' as const,
      path: '/api/settings/change-password',
      input: z.object({ oldPassword: z.string(), newPassword: z.string().min(1) }),
      responses: {
        200: z.object({ success: z.boolean() }),
        401: errorSchemas.unauthorized,
      },
    },
  },
  categories: {
    list: {
      method: 'GET' as const,
      path: '/api/categories',
      responses: {
        200: z.array(z.custom<typeof categories.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/categories',
      input: insertCategorySchema,
      responses: {
        201: z.custom<typeof categories.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/categories/:id',
      input: insertCategorySchema.partial(),
      responses: {
        200: z.custom<typeof categories.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/categories/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  customers: {
    list: {
      method: 'GET' as const,
      path: '/api/customers',
      input: z.object({
        search: z.string().optional(),
        from: z.string().optional(), // YYYY-MM-DD
        to: z.string().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof customers.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/customers/:id',
      responses: {
        200: z.custom<typeof customers.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/customers',
      input: insertCustomerSchema,
      responses: {
        201: z.custom<typeof customers.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/customers/:id',
      input: insertCustomerSchema.partial(),
      responses: {
        200: z.custom<typeof customers.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/customers/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
    bulkDelete: {
      method: 'POST' as const,
      path: '/api/customers/bulk-delete',
      input: z.object({ ids: z.array(z.number()) }),
      responses: {
        200: z.object({ success: z.boolean() }),
        403: errorSchemas.unauthorized,
      },
    },
    uploadPhoto: {
      method: 'POST' as const,
      path: '/api/customers/upload',
      // FormData input not strictly typed here, handled in route
      responses: {
        200: z.object({ url: z.string() }),
        400: errorSchemas.validation,
      },
    },
  },
  presets: {
    list: {
      method: 'GET' as const,
      path: '/api/presets',
      responses: {
        200: z.array(z.custom<typeof formPresets.$inferSelect & { fields: typeof formPresetFields.$inferSelect[] }>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/presets',
      input: z.object({ name: z.string() }),
      responses: {
        201: z.custom<typeof formPresets.$inferSelect>(),
      },
    },
    updateFields: {
      method: 'PUT' as const,
      path: '/api/presets/:id/fields',
      input: z.object({
        fields: z.array(z.object({
          id: z.number(),
          isEnabled: z.boolean(),
          orderIndex: z.number(),
        })),
      }),
      responses: {
        200: z.object({ success: z.boolean() }),
      },
    },
    setActive: {
      method: 'POST' as const,
      path: '/api/presets/:id/activate',
      responses: {
        200: z.object({ success: z.boolean() }),
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
