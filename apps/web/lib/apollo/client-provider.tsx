"use client";
import {
  ApolloClient,
  ApolloProvider,
  InMemoryCache,
  HttpLink,
} from "@apollo/client";
import { useMemo, type ReactNode } from "react";

// Standard ApolloProvider for client components.
// Uses a same-origin /api/graphql BFF so the raw JWT never leaves the server.
// RSC components use the separate server-client.ts (registerApolloClient) instead.
function makeClient() {
  return new ApolloClient({
    cache: new InMemoryCache(),
    link: new HttpLink({ uri: "/api/graphql" }),
  });
}

export function ApolloClientProvider({ children }: { children: ReactNode }) {
  const client = useMemo(makeClient, []);
  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}
