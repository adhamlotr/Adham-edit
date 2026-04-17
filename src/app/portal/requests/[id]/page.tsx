"use client";

import { use } from "react";
import Link from "next/link";
import { api } from "~/trpc/react";

export default function CustomerRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data, isLoading, error } = api.serviceRequests.getMine.useQuery({ id });

  if (isLoading) return <p className="p-8 text-gray-500">Loading...</p>;
  if (error) return <p className="p-8 text-red-500">Request not found or access denied.</p>;
  if (!data) return null;

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <Link href="/portal/requests" className="text-blue-600 underline text-sm mb-4 block">
        ← Back to my requests
      </Link>

      <h1 className="text-2xl font-bold mb-4">{data.reference}</h1>

      <div className="border border-gray-200 rounded p-4 mb-6 space-y-2 text-sm">
        <p><span className="font-medium">Type:</span> {data.type}</p>
        <p><span className="font-medium">Priority:</span> {data.priority}</p>
        <p><span className="font-medium">Status:</span> {data.status}</p>
        <p><span className="font-medium">Description:</span> {data.description}</p>
        <p><span className="font-medium">Created:</span> {new Date(data.createdAt).toLocaleString()}</p>
      </div>

      <h2 className="text-lg font-semibold mb-2">Status History</h2>
      {data.events.length === 0 ? (
        <p className="text-gray-500 text-sm mb-6">No history yet.</p>
      ) : (
        <ul className="mb-6 space-y-2 text-sm">
          {data.events.map((e) => (
            <li key={e.id} className="border border-gray-100 rounded p-2">
              {e.fromStatus ? `${e.fromStatus} → ${e.toStatus}` : `Created as ${e.toStatus}`}
              <span className="text-gray-400 ml-2">{new Date(e.at).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      )}

      <h2 className="text-lg font-semibold mb-2">Comments</h2>
      {data.comments.length === 0 ? (
        <p className="text-gray-500 text-sm">No comments yet.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {data.comments.map((c) => (
            <li key={c.id} className="border border-gray-100 rounded p-3">
              <p>{c.body}</p>
              <p className="text-gray-400 mt-1">{new Date(c.createdAt).toLocaleString()}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}