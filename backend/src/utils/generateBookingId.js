export const generateBookingId = () => {
  // readable, collision-resistant: RB-<timestamp>-<random4>
  const now = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `RB-${now}-${rand}`;
};
