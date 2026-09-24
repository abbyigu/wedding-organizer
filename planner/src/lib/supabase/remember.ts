// "Remember me": when it's unticked at sign-in the Supabase cookies are written without an expiry, so they last only
// until the browser closes. With no choice recorded the behaviour is exactly what it always was.
export const REMEMBER_COOKIE = "wr-remember";

type Opts = { maxAge?: number; expires?: Date | number | string; [k: string]: unknown };

export function withRememberChoice<T extends Opts>(options: T | undefined, remembered: string | undefined): T | undefined {
  if (!options || remembered !== "0") return options;
  const { maxAge, expires, ...rest } = options;
  void maxAge;
  void expires;
  return rest as unknown as T;
}
