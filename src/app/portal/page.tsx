"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";

export default function PortalPage() {
  const router = useRouter();
  const [type, setType] = useState("outage");
  const [priority, setPriority] = useState("medium");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  const create = api.serviceRequests.create.useMutation({
    onSuccess: () => router.push("/portal/requests"),
    onError: (e) => setError(e.message),
  });

  function handleSubmit() {
    setError("");
    if (description.length < 10) {
      setError("Description must be at least 10 characters.");
      return;
    }
    create.mutate({
  type: type as "outage" | "billing" | "start_service" | "stop_service" | "other",
  priority: priority as "low" | "medium" | "high",
  description,
});
  }

  return (
    <div className="p-8 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">Submit a Service Request</h1>

         <div className="flex justify-between mb-4">
          <Link href="/" className="text-sm text-blue-600 underline hover:text-blue-800">
            ← Home
          </Link>
          <Link href="/portal/requests" className="text-sm text-blue-600 underline hover:text-blue-800">
            View my requests →
          </Link>
        </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Type</label>
          <select
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="outage">Outage</option>
            <option value="billing">Billing</option>
            <option value="start_service">Start Service</option>
            <option value="stop_service">Stop Service</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Priority</label>
          <select
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm h-32 resize-none"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your issue (10–2000 characters)"
          />
          <p className="text-xs text-gray-400 mt-1">{description.length}/2000</p>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <Button onClick={handleSubmit} disabled={create.isPending}>
          {create.isPending ? "Submitting..." : "Submit Request"}
        </Button>
      </div>
    </div>
  );
}