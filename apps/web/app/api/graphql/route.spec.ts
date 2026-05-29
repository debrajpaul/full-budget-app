import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// vi.mock is hoisted before imports, so these mocks are in place
// before route.ts is evaluated.
vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  env: {
    GRAPHQL_ENDPOINT: "http://localhost:4005/graphql",
    SESSION_COOKIE_NAME: "__Host-session",
    NODE_ENV: "test",
  },
}));

import { cookies } from "next/headers";
import { POST } from "./route";

const mockCookies = vi.mocked(cookies);

function makeRequest(body = JSON.stringify({ query: "{ __typename }" })) {
  return new NextRequest("http://localhost:3000/api/graphql", {
    method: "POST",
    body,
    headers: { "content-type": "application/json" },
  });
}

function makeUpstreamResponse(status = 200, data: unknown = { data: {} }) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/graphql", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("forwards the session cookie as an Authorization: Bearer header", async () => {
    mockCookies.mockResolvedValue({
      get: (name: string) =>
        name === "__Host-session" ? { name, value: "test-jwt" } : undefined,
    } as any);

    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockResolvedValue(makeUpstreamResponse());

    await POST(makeRequest());

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("http://localhost:4005/graphql");
    expect((init!.headers as Record<string, string>).authorization).toBe(
      "Bearer test-jwt"
    );
  });

  it("omits the Authorization header when no session cookie is present", async () => {
    mockCookies.mockResolvedValue({
      get: () => undefined,
    } as any);

    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockResolvedValue(makeUpstreamResponse());

    await POST(makeRequest());

    const [, init] = fetchSpy.mock.calls[0];
    expect(
      (init!.headers as Record<string, string>).authorization
    ).toBeUndefined();
  });

  it("proxies the request body to the upstream endpoint unchanged", async () => {
    mockCookies.mockResolvedValue({ get: () => undefined } as any);

    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockResolvedValue(makeUpstreamResponse());

    const body = JSON.stringify({ query: "mutation Login { __typename }" });
    await POST(makeRequest(body));

    const [, init] = fetchSpy.mock.calls[0];
    expect(init!.body).toBe(body);
  });

  it("returns the upstream HTTP status code", async () => {
    mockCookies.mockResolvedValue({ get: () => undefined } as any);

    vi.spyOn(global, "fetch").mockResolvedValue(
      makeUpstreamResponse(401, { errors: [{ message: "Unauthorized" }] })
    );

    const res = await POST(makeRequest());

    expect(res.status).toBe(401);
  });
});
