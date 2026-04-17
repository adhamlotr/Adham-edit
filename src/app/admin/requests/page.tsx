"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "~/trpc/react";

const STATUSES = ["submitted", "in_progress", "resolved", "rejected", "closed"];
const PRIORITIES = ["low", "medium", "high"];

export default function AdminQueuePage() {
  const [status, setStatus] = useState<string | undefined>();
  const [priority, setPriority] = useState<string | undefined>();

  const { data: requests, isLoading } = api.serviceRequests.listAll.useQuery({
    status: status as "submitted" | "in_progress" | "resolved" | "rejected" | "closed" | undefined,
    priority: priority as "low" | "medium" | "high" | undefined,
    sort: "desc",
  });

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Admin Queue</h1>

      <h1 className="text-2xl font-bold mb-6">Admin Queue</h1>

      <div className="mb-4">
        <Link href="/" className="text-sm text-blue-600 underline hover:text-blue-800">
          ← Home
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <select
          className="border border-gray-300 rounded px-3 py-2 text-sm"
          value={status ?? ""}
          onChange={(e) => setStatus(e.target.value || undefined)}
        >
          <option value="">All Statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <select
          className="border border-gray-300 rounded px-3 py-2 text-sm"
          value={priority ?? ""}
          onChange={(e) => setPriority(e.target.value || undefined)}
        >
          <option value="">All Priorities</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      {isLoading && <p className="text-gray-500">Loading...</p>}

      {!isLoading && !requests?.length && (
        <p className="text-gray-500">No requests found.</p>
      )}

      {!!requests?.length && (
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
                  <Link href={`/admin/requests/${r.id}`} className="text-blue-600 underline">
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
      )}
    </div>
  );
}