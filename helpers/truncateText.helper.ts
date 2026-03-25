export const truncateText = (text: string, limit: number): string => {
  const safeText = String(text ?? "");
  const safeLimit = Math.max(0, Number(limit) || 0);
  if (safeText.length <= safeLimit) return safeText;
  return `${safeText.slice(0, safeLimit)}...`;
};

export default truncateText;