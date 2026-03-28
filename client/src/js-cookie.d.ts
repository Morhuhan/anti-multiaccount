declare module 'js-cookie' {
  type CookieAttributes = {
    expires?: number | Date | undefined
    path?: string | undefined
    domain?: string | undefined
    secure?: boolean | undefined
    sameSite?: 'strict' | 'Strict' | 'lax' | 'Lax' | 'none' | 'None' | undefined
  }

  const Cookies: {
    get(name: string): string | undefined
    set(name: string, value: string, options?: CookieAttributes): string | undefined
    remove(name: string, options?: CookieAttributes): void
  }

  export default Cookies
}
