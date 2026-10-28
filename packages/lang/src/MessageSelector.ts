/**
 * Picks the right plural form from a translation line.
 *
 * Supported formats:
 *
 * - `'apple|apples'` — forms chosen by the locale's plural rules.
 * - `'{0} No apples|{1} One apple|[2,*] :count apples'` — explicit counts and ranges.
 * - Both mixed: explicit segments are checked first, the rest are plural forms.
 *
 * Plural rules come from `Intl.PluralRules`, so every locale Node knows works
 * without a hand-written table.
 */
export class MessageSelector {
  private static readonly categoryOrder: Intl.LDMLPluralRule[] = ['zero', 'one', 'two', 'few', 'many', 'other']
  private static readonly rulesCache = new Map<string, Intl.PluralRules>()

  /**
   * Select the line for `count` in `locale`.
   *
   * @param line    The full line containing `|`-separated forms.
   * @param count   The number to pluralize for.
   * @param locale  Locale whose plural rules apply.
   */
  choose(line: string, count: number, locale: string): string {
    const segments = line.split('|')

    const explicit = this.extract(segments, count)
    if (explicit !== undefined) return explicit.trim()

    const forms = segments.map((segment) => this.stripCondition(segment))

    if (forms.length === 1) return forms[0].trim()

    const index = this.pluralIndex(locale, count)

    return (forms[index] ?? forms[forms.length - 1]).trim()
  }

  /**
   * Return the first segment whose explicit condition matches `count`.
   */
  private extract(segments: string[], count: number): string | undefined {
    for (const segment of segments) {
      const match = segment.match(/^[\s]*([{[]([^\]}]*)[\]}])\s*([\s\S]*)$/)

      if (!match) continue

      if (this.matches(match[1], count)) return match[3]
    }
  }

  /**
   * Check a condition: `{1}`, `{1,3,5}` (any of), `[2,10]`, `[2,*]`, `[*,0]`.
   */
  private matches(condition: string, count: number): boolean {
    const body = condition.slice(1, -1)

    if (condition.startsWith('{')) {
      return body
        .split(',')
        .map((value) => value.trim())
        .some((value) => value === '*' || Number(value) === count)
    }

    const [from, to] = body.split(',').map((value) => value.trim())

    if (to === undefined) return from === '*' || Number(from) === count

    const lower = from === '*' ? -Infinity : Number(from)
    const upper = to === '*' ? Infinity : Number(to)

    return count >= lower && count <= upper
  }

  private stripCondition(segment: string): string {
    return segment.replace(/^[\s]*[{[][^\]}]*[\]}]\s*/, '')
  }

  /**
   * Index of the plural form for `count`, ordered zero → other using the
   * categories the locale actually has. For English that is `one` = 0,
   * `other` = 1; for Russian `one` = 0, `few` = 1, `many` = 2.
   */
  private pluralIndex(locale: string, count: number): number {
    const rules = this.rules(locale)
    const categories = MessageSelector.categoryOrder.filter((category) =>
      rules.resolvedOptions().pluralCategories.includes(category),
    )

    return Math.max(0, categories.indexOf(rules.select(count)))
  }

  private rules(locale: string): Intl.PluralRules {
    const tag = locale.replace(/_/g, '-')
    let rules = MessageSelector.rulesCache.get(tag)

    if (!rules) {
      try {
        rules = new Intl.PluralRules(tag)
      } catch {
        rules = new Intl.PluralRules('en')
      }

      MessageSelector.rulesCache.set(tag, rules)
    }

    return rules
  }
}
