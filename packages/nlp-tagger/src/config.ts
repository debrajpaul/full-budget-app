const ENV = process.env.NODE_ENV || "development";

export const DEFAULT_EPOCHS = ENV === "test" ? 1 : 10;
export const WINDOW_DAYS = 30;
export const MAX_DATASET_LENGTH = ENV === "test" ? 20 : Infinity;

export default {
  DEFAULT_EPOCHS,
  WINDOW_DAYS,
  MAX_DATASET_LENGTH,
};
