/** Junta classes condicionais (`cx('a', ok && 'b')`) — sem dependência. */
export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}
