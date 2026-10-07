<?php

namespace App\Support;

use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;

/**
 * Encrypts (or decrypts) existing rows of every table that holds patient data, in place.
 *
 * Idempotent: values that are already encrypted are left alone, so it is safe to run repeatedly (for example
 * to catch rows written by an older version of the app during a deploy). It works on raw rows, bypassing the
 * models, so it needs no knowledge of casts and cannot be confused by half-migrated data.
 *
 * The same column lists must be mirrored by the model casts; EncryptionAtRestTest checks they agree.
 */
class PhiProtector
{
    /** @var array<string, array{text?: string[], json?: string[]}> */
    public const COLUMNS = [
        'users' => ['text' => ['name', 'mobile']],
        'patients' => [
            'text' => ['name', 'mobile', 'email', 'address', 'abha_id', 'emergency_contact_name', 'emergency_contact_mobile', 'date_of_birth'],
            'json' => ['medical_history', 'current_medications'],
        ],
        'allergies' => ['text' => ['allergen', 'reaction']],
        'appointments' => ['text' => ['chief_complaint', 'notes', 'cancel_reason']],
        'symptoms' => ['text' => ['transcription'], 'json' => ['symptoms', 'red_flags']],
        'diagnoses' => ['text' => ['notes']],
        'soap_notes' => ['text' => ['subjective', 'objective', 'assessment', 'plan']],
        'ai_briefs' => [
            'text' => ['brief_text', 'risk_rationale', 'doctor_feedback'],
            'json' => ['suggested_questions', 'similar_cases', 'red_flags'],
        ],
        'reports' => ['text' => ['file_name', 'ai_summary'], 'json' => ['ai_findings']],
        'prescriptions' => ['text' => ['instructions'], 'json' => ['medicines']],
        'followups' => ['text' => ['ai_summary'], 'json' => ['questions', 'responses']],
        'outcomes' => ['text' => ['patient_notes'], 'json' => ['symptom_scores', 'side_effects']],
    ];

    /** Encrypt everything that is still plaintext. @return array<string,int> rows changed per table */
    public static function protectAll(): array
    {
        return self::run(true);
    }

    /** Reverse of protectAll (used by the migration's down()). */
    public static function revealAll(): array
    {
        return self::run(false);
    }

    private static function run(bool $encrypt): array
    {
        $changed = [];
        foreach (self::COLUMNS as $table => $spec) {
            $changed[$table] = 0;
            DB::table($table)->orderBy('id')->chunkById(200, function ($rows) use ($table, $spec, $encrypt, &$changed) {
                foreach ($rows as $row) {
                    $updates = self::transformRow($row, $spec, $encrypt);

                    if ($encrypt) {
                        $updates += self::blindIndexes($table, $row);
                    }
                    if ($updates) {
                        DB::table($table)->where('id', $row->id)->update($updates);
                        $changed[$table]++;
                    }
                }
            });
        }

        return $changed;
    }

    private static function transformRow(object $row, array $spec, bool $encrypt): array
    {
        $updates = [];

        foreach ($spec['text'] ?? [] as $col) {
            $value = $row->{$col} ?? null;
            if ($value === null || $value === '') {
                continue;
            }
            $new = $encrypt ? self::encryptText((string) $value) : self::decryptText((string) $value);
            if ($new !== (string) $value) {
                $updates[$col] = $new;
            }
        }

        foreach ($spec['json'] ?? [] as $col) {
            $value = $row->{$col} ?? null;
            if ($value === null) {
                continue;
            }
            $new = $encrypt ? self::encryptJson((string) $value) : self::decryptJson((string) $value);
            if ($new !== (string) $value) {
                $updates[$col] = $new;
            }
        }

        return $updates;
    }

    /** Hashes are computed from the PLAINTEXT, wherever the row currently is in the migration. */
    private static function blindIndexes(string $table, object $row): array
    {
        if ($table === 'users') {
            return ['mobile_hash' => BlindIndex::mobileHash(self::plain($row->mobile ?? null))];
        }
        if ($table === 'patients') {
            $name = self::plain($row->name ?? null);
            $mobile = self::plain($row->mobile ?? null);

            return [
                'mobile_hash' => BlindIndex::mobileHash($mobile),
                'search_index' => implode(' ', BlindIndex::patientTokens($name, $mobile)),
            ];
        }

        return [];
    }

    private static function plain(?string $value): ?string
    {
        return $value === null || $value === '' ? null : self::decryptText($value);
    }

    public static function isEncrypted(string $value): bool
    {
        try {
            Crypt::decryptString($value);

            return true;
        } catch (DecryptException) {
            return false;
        }
    }

    private static function encryptText(string $value): string
    {
        return self::isEncrypted($value) ? $value : Crypt::encryptString($value);
    }

    private static function decryptText(string $value): string
    {
        return self::isEncrypted($value) ? Crypt::decryptString($value) : $value;
    }

    private static function encryptJson(string $raw): string
    {
        $decoded = json_decode($raw, true);
        if (is_string($decoded) && self::isEncrypted($decoded)) {
            return $raw; // already protected
        }

        return json_encode(Crypt::encryptString(json_encode($decoded, JSON_THROW_ON_ERROR)), JSON_THROW_ON_ERROR);
    }

    private static function decryptJson(string $raw): string
    {
        $decoded = json_decode($raw, true);

        return is_string($decoded) && self::isEncrypted($decoded) ? Crypt::decryptString($decoded) : $raw;
    }
}
