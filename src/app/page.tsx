import Link from "next/link";

export default function Home(): React.ReactElement {
  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-semibold">Service Requests — Take-Home Starter</h1>
      <p className="mt-2 text-neutral-600">
        Welcome. See <code>README.md</code> for the assignment brief.
      </p>
      <ul className="mt-6 space-y-2">
        <li>
          <Link href="/login" className="text-blue-600 underline">
            Log in
          </Link>
        </li>
        <li>
          <Link href="/portal" className="text-blue-600 underline">
            Portal (customer area)
          </Link>
        </li>
        <li>
          <Link href="/admin" className="text-blue-600 underline">
            Admin
          </Link>
        </li>
      </ul>
    </main>
  );
}
