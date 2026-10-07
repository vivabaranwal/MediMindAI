<?php

namespace App\Casts;

use Illuminate\Contracts\Database\Eloquent\CastsAttributes;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Crypt;

/**
 * Encrypts an array/object for storage in a JSON (jsonb) column.
 *
 * The column keeps its type: what is stored is a JSON *string* holding the ciphertext, which is valid JSON, so
 * no schema change is needed. Reading decrypts (and fails loudly if the data was tampered with or was never
 * encrypted); nothing here ever falls back to plaintext.
 */
class EncryptedJson implements CastsAttributes
{
    public function get(Model $model, string $key, mixed $value, array $attributes): mixed
    {
        if ($value === null) {
            return null;
        }

        $ciphertext = json_decode((string) $value, true);
        if (! is_string($ciphertext)) {
            throw new \RuntimeException("{$model->getTable()}.{$key} holds unencrypted data; run the PHI encryption migration.");
        }

        return json_decode(Crypt::decryptString($ciphertext), true);
    }

    public function set(Model $model, string $key, mixed $value, array $attributes): mixed
    {
        if ($value === null) {
            return null;
        }

        return json_encode(Crypt::encryptString(json_encode($value, JSON_THROW_ON_ERROR)), JSON_THROW_ON_ERROR);
    }
}
