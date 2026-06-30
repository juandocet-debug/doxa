export const cleanUrl = (u: string): string => {
  try {
    const parsed = new URL(u);
    return parsed.origin + parsed.pathname;
  } catch {
    return u;
  }
};
