import { ETenantType } from "@common";

export const tenantResolvers = {
  Query: {
    tenants: () => [
      { id: ETenantType.personal, name: "Personal" },
      { id: ETenantType.client, name: "Client" },
      { id: ETenantType.default, name: "Default" },
    ],
  },
};