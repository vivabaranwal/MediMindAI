<?php

namespace App\Support;

/**
 * Keyed hashes that let the database find encrypted rows without ever seeing the plaintext.
 *
 * Encrypted columns cannot be searched (every ciphertext is random). Instead we store HMAC-SHA256 tokens of
 * the values users search by, using a secret key, and search by hashing the query the same way. Someone
 * with only a database dump learns nothing from the tokens without the key.
 *
 * Trade-off (deliberate): only whole-number matches for phone numbers (and last digits), and name PREFIXES
 * of at least `search_min_chars` letters, can be searched. Substring-anywhere search is not possible.
 */
class BlindIndex
{
    public static function hash(string $purpose, string $value): string
    {
        return hash_hmac('sha256', $purpose . ':' . $value, (string) config('security.blind_index_key'));
    }

    /** Digits only, national significant part (last 10 digits when longer): "+91 98765-43210" => "9876543210". */
    public static function normalizeMobile(string $mobile): string
    {
        $digits = preg_replace('/\D+/', '', $mobile) ?? '';

        return strlen($digits) > 10 ? substr($digits, -10) : $digits;
    }

    /** Exact-match key for a mobile number (duplicate detection, login lookup). */
    public static function mobileHash(?string $mobile): ?string
    {
        $normalized = $mobile === null ? '' : self::normalizeMobile($mobile);

        return $normalized === '' ? null : self::hash('mobile', $normalized);
    }

    /** @return string[] lowercase words of at least one letter/digit */
    private static function words(string $text): array
    {
        $text = mb_strtolower($text);

        return array_values(array_filter(preg_split('/[^\p{L}\p{N}]+/u', $text) ?: [], fn ($w) => $w !== ''));
    }

    /** Tokens stored on the row: every prefix (>= min chars) of every name word, plus mobile prefixes. */
    public static function patientTokens(?string $name, ?string $mobile): array
    {
        $min = (int) config('security.search_min_chars');
        $tokens = [];

        foreach (self::words((string) $name) as $word) {
            $len = mb_strlen($word);
            for ($i = $min; $i <= $len; $i++) {
                $tokens[] = self::hash('name', mb_substr($word, 0, $i));
            }
        }

        $digits = $mobile === null ? '' : self::normalizeMobile($mobile);
        for ($i = 4; $i <= strlen($digits); $i++) {
            $tokens[] = self::hash('mobile-prefix', substr($digits, 0, $i));
        }
        if (strlen($digits) >= 4) {
            $tokens[] = self::hash('mobile-last4', substr($digits, -4));
        }

        return array_values(array_unique($tokens));
    }

    /**
     * Tokens a search term must match (all of them: AND). Words become name-prefix tokens; digit runs of 4+
     * become mobile tokens (a 4-digit run matches either a number prefix or the last four digits).
     *
     * @return array<int, string[]> each inner array is "any of these tokens"
     */
    public static function searchGroups(string $term): array
    {
        $min = (int) config('security.search_min_chars');
        $groups = [];

        foreach (preg_split('/\s+/', trim($term)) ?: [] as $part) {
            if ($part === '') {
                continue;
            }
            $digits = preg_replace('/\D+/', '', $part) ?? '';
            if (strlen($digits) >= 4 && strlen($digits) >= mb_strlen($part) - 3) { // looks like a phone number
                $d = strlen($digits) > 10 ? substr($digits, -10) : $digits;
                $group = [self::hash('mobile-prefix', $d)];
                if (strlen($d) === 4) {
                    $group[] = self::hash('mobile-last4', $d);
                }
                $groups[] = $group;
                continue;
            }
            foreach (self::words($part) as $word) {
                if (mb_strlen($word) >= $min) {
                    $groups[] = [self::hash('name', $word)];
                }
            }
        }

        return $groups;
    }
}
