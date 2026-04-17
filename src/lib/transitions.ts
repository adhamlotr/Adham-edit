const allowed: Record<string, string[]> = {
  submitted:   ["in_progress", "rejected"],
  in_progress: ["resolved", "rejected"],
  resolved:    ["closed"],
  rejected:    [],
  closed:      [],
};

export function canTransition(from: string, to: string): boolean {
  return allowed[from]?.includes(to) ?? false;
}