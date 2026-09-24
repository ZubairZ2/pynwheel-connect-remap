/**
 * ModelDataConverter (react-architecture.md §11).
 *
 * The wire format is snake_case (and, in the legacy CMS, occasionally
 * kebab-case); models are camelCase. Nothing outside the parser layer should
 * ever see a snake_case key.
 */
type Json = unknown;

const toCamel = (key: string): string =>
  key.replace(/[-_](\w)/g, (_match, char: string) => char.toUpperCase());

export const ModelDataConverter = {
  toCamelCase<T = Json>(value: Json): T {
    if (Array.isArray(value)) {
      return value.map((item) => ModelDataConverter.toCamelCase(item)) as unknown as T;
    }

    if (value !== null && typeof value === 'object') {
      const source = value as Record<string, Json>;
      const result: Record<string, Json> = {};

      Object.keys(source).forEach((key) => {
        result[toCamel(key)] = ModelDataConverter.toCamelCase(source[key]);
      });

      return result as T;
    }

    return value as T;
  }
};
