<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use App\Support\BlindIndex;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

#[Fillable(['name', 'email', 'password', 'mobile', 'role', 'status', 'mobile_verified_at'])]
#[Hidden(['password', 'remember_token', 'mobile_hash'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable, HasRoles;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected static function booted(): void
    {
        // Keyed hash of the (encrypted) mobile number: login lookup and uniqueness work without plaintext.
        static::saving(function (User $user) {
            if (! $user->exists || $user->isDirty('mobile') || $user->mobile_hash === null) {
                $user->mobile_hash = BlindIndex::mobileHash($user->mobile);
            }
        });
    }

    /** Look a user up by mobile number. */
    public static function findByMobile(string $mobile): ?self
    {
        return static::where('mobile_hash', BlindIndex::mobileHash($mobile))->first();
    }

    public function doctor(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(Doctor::class);
    }

    protected function casts(): array
    {
        return [
            'name' => 'encrypted',
            'mobile' => 'encrypted',
            'email_verified_at' => 'datetime',
            'mobile_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }
}
