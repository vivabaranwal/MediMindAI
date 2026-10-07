<?php

namespace App\Rules;

use App\Models\User;
use App\Support\BlindIndex;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/** `unique:users,mobile` cannot work on an encrypted column; compare keyed hashes instead. */
class UniqueMobile implements ValidationRule
{
    public function __construct(private ?int $ignoreUserId = null)
    {
    }

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $hash = BlindIndex::mobileHash((string) $value);
        if ($hash === null) {
            $fail('The :attribute must contain a valid phone number.');
            return;
        }

        $taken = User::where('mobile_hash', $hash)
            ->when($this->ignoreUserId, fn ($q) => $q->where('id', '!=', $this->ignoreUserId))
            ->exists();

        if ($taken) {
            $fail('The :attribute has already been taken.');
        }
    }
}
