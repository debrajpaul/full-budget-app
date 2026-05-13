"use client";
import { ApolloNextAppProvider } from "@apollo/experimental-nextjs-app-support";
import { ApolloClient, InMemoryCache, HttpLink } from "@apollo/client";
import { type ReactNode } from "react";

// Called once per browser session — always points at the BFF proxy so the
// raw JWT never leaves the server.
function makeClient() {
  return new ApolloClient({
    cache: new InMemoryCache(),
    link: new HttpLink({ uri: "/api/graphql" }),
  });
}

export function ApolloClientProvider({ children }: { children: ReactNode }) {
  return (
    <ApolloNextAppProvider makeClient={makeClient}>
      {children}
    </ApolloNextAppProvider>
  );
}
