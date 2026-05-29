import { getClient } from "@/lib/apollo/server-client";
import { SavingsGoalsDocument } from "@/lib/graphql/goals";
import { GoalsView } from "@/components/goals/goals-view";

export const dynamic = "force-dynamic";

export const metadata = { title: "Goals · full-budget" };

export default async function GoalsPage() {
  const [result] = await Promise.allSettled([
    (await getClient()).query({
      query: SavingsGoalsDocument,
      fetchPolicy: "no-cache",
    }),
  ]);

  const initialGoals =
    result.status === "fulfilled"
      ? (result.value.data?.savingsGoals ?? [])
      : [];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Goals</h1>
        <p className="text-sm text-muted-foreground">
          Track your savings goals and contributions.
        </p>
      </div>
      <GoalsView initialGoals={initialGoals} />
    </div>
  );
}
