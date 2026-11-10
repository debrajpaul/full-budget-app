import { getClient } from "@/lib/apollo/server-client";
import { SinkingFundsDocument } from "@/lib/graphql/sinking-funds";
import { SinkingFundsView } from "@/components/sinking-funds/sinking-funds-view";
import type { SinkingFundsQuery } from "@app/api-client";

export const dynamic = "force-dynamic";

export default async function SinkingFundsPage() {
  let initialFunds: SinkingFundsQuery["sinkingFunds"] = [];
  try {
    const client = await getClient();
    const { data } = await client.query({
      query: SinkingFundsDocument,
      fetchPolicy: "no-cache",
    });
    initialFunds = data?.sinkingFunds ?? [];
  } catch {
    // Server-side auth/network errors fall back to empty list;
    // SinkingFundsView's useQuery retries on the client via the BFF.
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Sinking Funds</h1>
        <p className="text-sm text-muted-foreground">
          Set aside money for planned future expenses.
        </p>
      </div>
      <SinkingFundsView initialFunds={initialFunds} />
    </div>
  );
}
