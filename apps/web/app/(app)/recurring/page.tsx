import { getClient } from "@/lib/apollo/server-client";
import { RecurringTransactionsDocument } from "@/lib/graphql/recurring";
import type { RecurringTransactionsQuery } from "@api-client";
import { RecurringView } from "@/components/recurring/recurring-view";

export const dynamic = "force-dynamic";

export const metadata = { title: "Recurring · full-budget" };

export default async function RecurringPage() {
  let initialItems: RecurringTransactionsQuery["recurringTransactions"] = [];
  try {
    const { data } = await (
      await getClient()
    ).query({
      query: RecurringTransactionsDocument,
      fetchPolicy: "no-cache",
    });
    initialItems = data?.recurringTransactions ?? [];
  } catch {
    // Server-side auth/network errors fall back to empty list;
    // RecurringView's useQuery retries on the client via the BFF.
  }

  return <RecurringView initialItems={initialItems} />;
}
