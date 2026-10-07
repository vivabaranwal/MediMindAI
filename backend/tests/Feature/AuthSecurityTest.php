<?php

namespace Tests\Feature;

use App\Contracts\SmsGateway;
use App\Enums\UserRole;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthSecurityTest extends TestCase
{
    use RefreshDatabase;

    private object $sms;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);

        // Capture outgoing SMS so tests can read the generated code.
        $this->sms = new class implements SmsGateway {
            public array $sent = [];
            public function send(string $mobile, string $message): void
            {
                $this->sent[] = [$mobile, $message];
            }
            public function lastCode(): ?string
            {
                $last = end($this->sent);
                return $last && preg_match('/\b(\d{6})\b/', $last[1], $m) ? $m[1] : null;
            }
        };
        $this->app->instance(SmsGateway::class, $this->sms);
    }

    private function makeUser(UserRole $role, string $mobile): User
    {
        $user = User::create([
            'name' => ucfirst($role->value),
            'email' => "{$role->value}@medimind.test",
            'mobile' => $mobile,
            'password' => bcrypt('a-strong-password'),
            'role' => $role->value,
            'status' => 'active',
        ]);
        $user->assignRole($role->value);
        return $user;
    }

    public function test_public_registration_endpoint_does_not_exist(): void
    {
        $this->postJson('/api/auth/register', [
            'name' => 'Mallory',
            'email' => 'mallory@evil.test',
            'mobile' => '+910000000000',
            'password' => 'password123',
            'role' => 'clinic_admin',
        ])->assertStatus(404);

        $this->assertDatabaseMissing('users', ['email' => 'mallory@evil.test']);
    }

    public function test_universal_master_otp_is_rejected(): void
    {
        $this->makeUser(UserRole::FrontDesk, '+911111111111');

        $this->postJson('/api/auth/login', ['mobile' => '+911111111111', 'otp' => '123456'])
            ->assertStatus(422);
    }

    public function test_otp_login_succeeds_with_the_issued_code_only_once(): void
    {
        $this->makeUser(UserRole::FrontDesk, '+911111111111');

        $this->postJson('/api/auth/send-otp', ['mobile' => '+911111111111'])
            ->assertOk()
            ->assertJsonMissingPath('otp');

        $code = $this->sms->lastCode();
        $this->assertNotNull($code);

        $this->postJson('/api/auth/login', ['mobile' => '+911111111111', 'otp' => $code])
            ->assertOk()
            ->assertJsonStructure(['access_token']);

        // Replay must fail: codes are single-use.
        $this->postJson('/api/auth/login', ['mobile' => '+911111111111', 'otp' => $code])
            ->assertStatus(422);
    }

    public function test_otp_locks_after_too_many_wrong_guesses(): void
    {
        $this->makeUser(UserRole::FrontDesk, '+911111111111');
        $this->postJson('/api/auth/send-otp', ['mobile' => '+911111111111'])->assertOk();
        $code = $this->sms->lastCode();
        $wrong = $code === '000000' ? '000001' : '000000';

        for ($i = 0; $i < config('otp.max_attempts'); $i++) {
            $this->postJson('/api/auth/login', ['mobile' => '+911111111111', 'otp' => $wrong])->assertStatus(422);
        }

        // Even the correct code no longer works once locked.
        $this->postJson('/api/auth/login', ['mobile' => '+911111111111', 'otp' => $code])->assertStatus(422);
    }

    public function test_otp_resend_is_rate_limited_per_number(): void
    {
        $this->postJson('/api/auth/send-otp', ['mobile' => '+911111111111'])->assertOk();
        $this->postJson('/api/auth/send-otp', ['mobile' => '+911111111111'])->assertStatus(429);
    }

    public function test_otp_cannot_be_used_to_sign_in_as_doctor_or_admin(): void
    {
        foreach ([UserRole::Doctor, UserRole::ClinicAdmin] as $i => $role) {
            $mobile = "+92000000000{$i}";
            $this->makeUser($role, $mobile);
            $this->postJson('/api/auth/send-otp', ['mobile' => $mobile])->assertOk();

            $this->postJson('/api/auth/login', ['mobile' => $mobile, 'otp' => $this->sms->lastCode()])
                ->assertStatus(403);
        }
    }

    public function test_otp_response_does_not_reveal_whether_a_number_is_registered(): void
    {
        $this->postJson('/api/auth/send-otp', ['mobile' => '+913333333333'])
            ->assertOk()
            ->assertJsonPath('message', 'If the number is registered, a code has been sent.');
    }

    // ------------------------------------------------------------ cookie (web app) mode

    private const FRONTEND = ['Origin' => 'http://localhost:3000', 'Referer' => 'http://localhost:3000/'];

    public function test_web_app_signs_in_with_a_session_cookie_and_never_receives_a_token(): void
    {
        $this->makeUser(UserRole::Doctor, '+912222222222');

        $res = $this->withHeaders(self::FRONTEND)
            ->postJson('/api/auth/login', ['email' => 'doctor@medimind.test', 'password' => 'a-strong-password'])
            ->assertOk()
            ->assertJsonPath('user.role', 'doctor')
            ->assertJsonMissingPath('access_token');

        $cookie = $res->getCookie(config('session.cookie'), false);
        $this->assertNotNull($cookie, 'a session cookie must be issued');
        $this->assertTrue($cookie->isHttpOnly(), 'the session cookie must not be readable by page scripts');
        $this->assertSame('lax', $cookie->getSameSite());
    }

    public function test_session_cookie_authenticates_later_requests_and_logout_ends_it(): void
    {
        $this->makeUser(UserRole::FrontDesk, '+913333333333');
        $login = $this->withHeaders(self::FRONTEND)
            ->postJson('/api/auth/login', ['email' => 'front_desk@medimind.test', 'password' => 'a-strong-password'])->assertOk();
        $session = $login->getCookie(config('session.cookie'), false)->getValue();

        $this->withHeaders(self::FRONTEND)->withUnencryptedCookie(config('session.cookie'), $session)
            ->getJson('/api/user')->assertOk()->assertJsonPath('role', 'front_desk');

        $this->withHeaders(self::FRONTEND)->withUnencryptedCookie(config('session.cookie'), $session)
            ->postJson('/api/auth/logout')->assertOk();

        $this->flushSession();
        $this->app['auth']->forgetGuards();
        $this->withHeaders(self::FRONTEND)->withUnencryptedCookie(config('session.cookie'), $session)
            ->getJson('/api/user')->assertStatus(401);
    }

    public function test_unknown_email_and_wrong_password_look_identical(): void
    {
        $this->makeUser(UserRole::Doctor, '+914444444444');

        $a = $this->postJson('/api/auth/login', ['email' => 'nobody@medimind.test', 'password' => 'whatever-long'])->assertStatus(422);
        $b = $this->postJson('/api/auth/login', ['email' => 'doctor@medimind.test', 'password' => 'wrong-password'])->assertStatus(422);
        $this->assertSame($a->json(), $b->json());
    }

    public function test_inactive_account_cannot_sign_in_in_either_mode_and_gets_no_session(): void
    {
        $user = $this->makeUser(UserRole::Doctor, '+915555555555');
        $user->update(['status' => 'inactive']);

        $this->withHeaders(self::FRONTEND)
            ->postJson('/api/auth/login', ['email' => 'doctor@medimind.test', 'password' => 'a-strong-password'])->assertStatus(403);
        $this->assertFalse($this->app['auth']->guard('web')->check(), 'no session may be established for an inactive account');
        $this->postJson('/api/auth/login', ['email' => 'doctor@medimind.test', 'password' => 'a-strong-password'])
            ->assertStatus(403)->assertJsonMissingPath('access_token');
    }

    public function test_bearer_tokens_still_work_for_non_browser_clients(): void
    {
        $this->makeUser(UserRole::Doctor, '+916666666666');
        $token = $this->postJson('/api/auth/login', ['email' => 'doctor@medimind.test', 'password' => 'a-strong-password'])
            ->assertOk()->json('access_token');

        $this->withToken($token)->getJson('/api/user')->assertOk();
        $this->withToken($token)->postJson('/api/auth/logout')->assertOk();
        $this->app['auth']->forgetGuards();
        $this->withToken($token)->getJson('/api/user')->assertStatus(401);
    }
}
