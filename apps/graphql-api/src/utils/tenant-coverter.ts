import { ETenantType } from "@common";

export const convertToTenantId = (value: string | null): ETenantType => {
  switch (value) {
    case "PERSONAL":
      return ETenantType.personal;
    case "CLIENT":
      return ETenantType.client;
    default:
      return ETenantType.default;
  }
};
