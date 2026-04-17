"use client";

import Link from "next/link";
import { api } from "~/trpc/react";

export default function MyRequestsPage() {
  const { data: requests, isLoading } = api.serviceRequests.listMine.useQuery();

  if (isLoading) return <p className="p-8 text-gray-500">Loading...</p>;

  if (!requests?.length) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500 mb-4">You have no service requests yet.</p>
        <Link href="/portal" className="text-blue-600 underline">
          Submit your first request
        </Link>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">My Requests</h1>
        <Link href="/portal" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          New Request
        </Link>
      </div>
      <table className="w-full border-collapse border border-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="border border-gray-200 px-4 py-2 text-left">Reference</th>
            <th className="border border-gray-200 px-4 py-2 text-left">Type</th>
            <th className="border border-gray-200 px-4 py-2 text-left">Priority</th>
            <th className="border border-gray-200 px-4 py-2 text-left">Status</th>
            <th className="border border-gray-200 px-4 py-2 text-left">Created</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((r) => (
            <tr key={r.id} className="hover:bg-gray-50">
              <td className="border border-gray-200 px-4 py-2">
                <Link href={`/portal/requests/${r.id}`} className="text-blue-600 underline">
                  {r.reference}
                </Link>
              </td>
              <td className="border border-gray-200 px-4 py-2">{r.type}</td>
              <td className="border border-gray-200 px-4 py-2">{r.priority}</td>
              <td className="border border-gray-200 px-4 py-2">{r.status}</td>
              <td className="border border-gray-200 px-4 py-2">
                {new Date(r.createdAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}