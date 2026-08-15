const transitions: Record<string, readonly string[]> = {
  new: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export function canTransitionOrderStatus(from: string, to: string) {
  return transitions[from]?.includes(to) ?? false;
}
