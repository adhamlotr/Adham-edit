import superjson from "superjson";

export const transformer = superjson;

export const getBaseUrl = (): string => {
  if (typeof window !== "undefined") return "";
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL;
  return `http://localhost:${process.env.PORT ?? 3000}`;
};
