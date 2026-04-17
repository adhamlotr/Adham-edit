import { redirect } from "next/navigation";
import { auth } from "~/server/auth";

export default async function AdminPage(): Promise<React.ReactElement> {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin") {
    return (
      <main className="mx-auto max-w-2xl p-8">
        <h1 className="text-xl font-semibold">Admin</h1>
        <p className="mt-2 text-red-600">You are not authorized to view this page.</p>
      </main>
    );
  }

  redirect("/admin/requests");
}