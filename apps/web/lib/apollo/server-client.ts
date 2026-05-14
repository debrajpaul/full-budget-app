import { ApolloClient, InMemoryCache, HttpLink } from "@apollo/client";
import { registerApolloClient } from "@apollo/experimental-nextjs-app-support";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

export const { getClient } = registerApolloClient(async () => {
  const token = (await cookies()).get(env.SESSION_COOKIE_NAME)?.value;
  return new ApolloClient({
    cache: new InMemoryCache(),
    link: new HttpLink({
      uri: env.GRAPHQL_ENDPOINT,
      headers: token ? { authorization: `Bearer ${token}` } : {},
      fetchOptions: { cache: "no-store" },
    }),
  });
});
