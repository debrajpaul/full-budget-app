// Extend Vitest matchers here when component tests are added.
// Example: import '@testing-library/jest-dom' (add the package first).

// shadcn sidebar uses use-mobile.ts which calls window.matchMedia.
// jsdom does not implement matchMedia so we stub it globally.
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});
