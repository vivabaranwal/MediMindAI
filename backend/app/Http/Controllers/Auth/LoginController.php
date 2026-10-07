<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\OtpService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful;

/**
 * Two ways to authenticate, chosen by the caller:
 *  - the web app (a configured first-party origin) gets a session cookie: httpOnly, so page scripts can never read it;
 *  - any other client (scripts, tests) gets a bearer token.
 * The credential checks are identical either way.
 */
class LoginController extends Controller
{
    /** A real bcrypt hash used to spend the same time on unknown emails as on known ones. */
    private const DUMMY_HASH = '$2y$12$usesomesillystringfore7hnbRJHxXVLeakoG8K30oukPsA.ztMG';

    public function __construct(protected OtpService $otpService)
    {
    }

    /** POST /api/auth/login */
    public function login(Request $request): JsonResponse
    {
        return $request->has('mobile') ? $this->loginWithOtp($request) : $this->loginWithPassword($request);
    }

    protected function loginWithPassword(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $credentials['email'])->first();
        $valid = Hash::check($credentials['password'], $user->password ?? self::DUMMY_HASH);

        if (! $user || ! $valid) {
            throw ValidationException::withMessages(['email' => [__('auth.failed')]]);
        }

        if ($user->status !== 'active') {
            return response()->json(['success' => false, 'message' => 'Your account is suspended or inactive.'], 403);
        }

        return $this->signIn($request, $user);
    }

    protected function loginWithOtp(Request $request): JsonResponse
    {
        $request->validate([
            'mobile' => ['required', 'string', 'max:20'],
            'otp' => ['required', 'string', 'size:6'],
        ]);

        $mobile = $request->input('mobile');

        if (! $this->otpService->verifyOtp($mobile, $request->input('otp'))) {
            return response()->json(['success' => false, 'message' => 'Invalid or expired OTP.'], 422);
        }

        $user = User::findByMobile($mobile);
        if (! $user) {
            return response()->json(['success' => false, 'message' => 'Invalid or expired OTP.'], 422);
        }

        if ($user->status !== 'active') {
            return response()->json(['success' => false, 'message' => 'Your account is suspended or inactive.'], 403);
        }

        if (! in_array($user->role, config('otp.allowed_roles'), true)) {
            return response()->json(['success' => false, 'message' => 'This account must sign in with email and password.'], 403);
        }

        if (! $user->mobile_verified_at) {
            $user->update(['mobile_verified_at' => now()]);
        }

        return $this->signIn($request, $user);
    }

    /** GET /api/user */
    public function me(Request $request): JsonResponse
    {
        return response()->json($this->userPayload($request->user()));
    }

    /** POST /api/auth/logout */
    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($request->hasSession() && EnsureFrontendRequestsAreStateful::fromFrontend($request)) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        } else {
            $token = $user->currentAccessToken();
            if (method_exists($token, 'delete')) {
                $token->delete();
            }
        }

        return response()->json(['success' => true, 'message' => 'Logged out successfully.']);
    }

    private function signIn(Request $request, User $user): JsonResponse
    {
        if ($request->hasSession() && EnsureFrontendRequestsAreStateful::fromFrontend($request)) {
            Auth::guard('web')->login($user);
            $request->session()->regenerate(); // new id on privilege change: no session fixation

            return response()->json([
                'success' => true,
                'message' => 'Login successful.',
                'user' => $this->userPayload($user),
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Login successful.',
            'access_token' => $user->createToken('auth_token')->plainTextToken,
            'token_type' => 'Bearer',
            'user' => $this->userPayload($user),
        ]);
    }

    private function userPayload(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'mobile' => $user->mobile,
            'role' => $user->role,
            'doctor_id' => $user->doctor?->id,
            'doctor_level' => $user->doctor?->level,
        ];
    }
}
