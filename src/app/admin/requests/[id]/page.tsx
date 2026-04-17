"use client";

import { use, useState } from "react";
import Link from "next/link";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";

const TRANSITIONS: Record<string, string[]> = {
  submitted: ["in_progress", "rejected"],
  in_progress: ["resolved", "rejected"],
  resolved: ["closed"],
};

export default function AdminRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const utils = api.useUtils();

  const { data, isLoading, error } = api.serviceRequests.getOne.useQuery({ id });

  const [commentBody, setCommentBody] = useState("");
  const [visibility, setVisibility] = useState<"public" | "internal">("public");
  const [commentError, setCommentError] = useState("");

  const updateStatus = api.serviceRequests.updateStatus.useMutation({
    onSuccess: () => utils.serviceRequests.getOne.invalidate({ id }),
  });

  const addComment = api.serviceRequests.addComment.useMutation({
    onSuccess: () => {
      setCommentBody("");
      setCommentError("");
      utils.serviceRequests.getOne.invalidate({ id });
    },
    onError: (e) => setCommentError(e.message),
  });

  if (isLoading) return <p className="p-8 text-gray-500">Loading...</p>;
  if (error || !data) return <p className="p-8 text-red-500">Request not found.</p>;

  const allowedTransitions = TRANSITIONS[data.status] ?? [];

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <Link href="/admin/requests" className="text-blue-600 underline text-sm mb-4 block">
        ← Back to queue
      </Link>

      <h1 className="text-2xl font-bold mb-4">{data.reference}</h1>

      {/* Request Details */}
        <div className="border border-gray-200 rounded p-4 mb-6 space-y-2 text-sm">
            <p><span className="font-medium">Customer:</span> {data.customerEmail}</p>
            <p><span className="font-medium">Type:</span> {data.type}</p>
            <p><span className="font-medium">Priority:</span> {data.priority}</p>
            <p><span className="font-medium">Status:</span> {data.status}</p>
            <p><span className="font-medium">Description:</span> {data.description}</p>
            <p><span className="font-medium">Created:</span> {new Date(data.createdAt).toLocaleString()}</p>
        </div>

      {/* Status Transitions */}
      {allowedTransitions.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Change Status</h2>
          <div className="flex gap-2">
            {allowedTransitions.map((toStatus) => (
              <Button
                key={toStatus}
                onClick={() => updateStatus.mutate({ id, toStatus: toStatus as "in_progress" | "resolved" | "rejected" | "closed" })}
                disabled={updateStatus.isPending}
              >
                → {toStatus}
              </Button>
            ))}
          </div>
          {updateStatus.isError && (
            <p className="text-red-500 text-sm mt-2">{updateStatus.error.message}</p>
          )}
        </div>
      )}

      {/* Status History */}
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

      {/* Comments */}
      <h2 className="text-lg font-semibold mb-2">Comments</h2>
      {data.comments.length === 0 ? (
        <p className="text-gray-500 text-sm mb-4">No comments yet.</p>
      ) : (
        <ul className="mb-4 space-y-2 text-sm">
          {data.comments.map((c) => (
            <li
              key={c.id}
              className={`border rounded p-3 ${
                c.visibility === "internal"
                  ? "border-yellow-300 bg-yellow-50"
                  : "border-gray-100"
              }`}
            >
              <span className="text-xs font-semibold uppercase text-gray-400 mr-2">
                {c.visibility}
              </span>
              <p className="mt-1">{c.body}</p>
              <p className="text-gray-400 text-xs mt-1">
                {new Date(c.createdAt).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      )}

      {/* Add Comment */}
      <div className="border border-gray-200 rounded p-4 space-y-3">
        <h3 className="font-medium text-sm">Add Comment</h3>
        <textarea
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm h-24 resize-none"
          value={commentBody}
          onChange={(e) => setCommentBody(e.target.value)}
          placeholder="Write a comment..."
        />
        <div className="flex items-center gap-4">
          <select
            className="border border-gray-300 rounded px-3 py-2 text-sm"
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as "public" | "internal")}
          >
            <option value="public">Public</option>
            <option value="internal">Internal</option>
          </select>
          <Button
            onClick={() => addComment.mutate({ id, body: commentBody, visibility })}
            disabled={addComment.isPending || !commentBody.trim()}
          >
            {addComment.isPending ? "Posting..." : "Post Comment"}
          </Button>
        </div>
        {commentError && <p className="text-red-500 text-sm">{commentError}</p>}
      </div>
    </div>
  );
}