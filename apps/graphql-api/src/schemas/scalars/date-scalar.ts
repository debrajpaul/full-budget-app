import { GraphQLScalarType, GraphQLError, Kind } from "graphql";
import { DateResolver } from "graphql-scalars";

/**
 * Custom Date scalar built on top of graphql-scalars' DateResolver.
 *
 * Differences from the stock DateResolver:
 *  - parseValue / parseLiteral return a YYYY-MM-DD **string** rather than a JS
 *    Date object, keeping the domain layer's string convention unchanged.
 *  - serialize also accepts raw strings so resolvers can return stored ISO date
 *    strings directly without constructing Date objects.
 *
 * Validation: values must be valid ISO-8601 calendar dates (YYYY-MM-DD).
 * Invalid formats or non-existent dates (e.g. 2024-02-30) are rejected.
 */

// YYYY-MM-DD — month 01-12, day 01-31 (calendar validity verified by component round-trip)
const ISO_DATE_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export function assertIsoDate(value: unknown): string {
  if (typeof value !== "string") {
    throw new GraphQLError(
      `Date scalar: expected a string in YYYY-MM-DD format, got ${typeof value}`
    );
  }
  if (!ISO_DATE_RE.test(value)) {
    throw new GraphQLError(
      `Date scalar: "${value}" does not match YYYY-MM-DD format`
    );
  }
  // V8 silently rolls invalid dates (e.g. Feb 30 → Mar 1), so Date.parse alone
  // is insufficient. Reconstruct in UTC and verify each component matches.
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() + 1 !== m ||
    dt.getUTCDate() !== d
  ) {
    throw new GraphQLError(
      `Date scalar: "${value}" is not a valid calendar date`
    );
  }
  return value;
}

export const DateScalar = new GraphQLScalarType({
  // Re-use the well-known name and description from graphql-scalars so
  // tooling (GraphiQL, schema linters) recognises it as the standard Date scalar.
  name: DateResolver.name,
  description: DateResolver.description,

  serialize(value: unknown): string {
    if (value instanceof Date) {
      const iso = value.toISOString().split("T")[0];
      return assertIsoDate(iso);
    }
    return assertIsoDate(value);
  },

  parseValue(value: unknown): string {
    return assertIsoDate(value);
  },

  parseLiteral(ast): string {
    if (ast.kind !== Kind.STRING) {
      throw new GraphQLError(
        `Date scalar: expected a string literal, got ${ast.kind}`
      );
    }
    return assertIsoDate(ast.value);
  },
});
