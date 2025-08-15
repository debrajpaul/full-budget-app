import { ETenantType } from "@common";

export const convertToTenantId = (value: string | null): ETenantType => {
  switch (value) {
    case "personal":
      return ETenantType.personal;
    case "client":
      return ETenantType.client;
    default:
      return ETenantType.default;
  }
};
