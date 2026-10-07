<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(
            \App\Contracts\SmsGateway::class,
            \App\Services\Sms\LogSmsGateway::class
        );
        $this->app->bind(
            \App\Repositories\Contracts\PatientRepositoryInterface::class,
            \App\Repositories\PatientRepository::class
        );
        $this->app->bind(
            \App\Repositories\Contracts\AppointmentRepositoryInterface::class,
            \App\Repositories\AppointmentRepository::class
        );
        $this->app->bind(
            \App\Repositories\Contracts\SoapNoteRepositoryInterface::class,
            \App\Repositories\SoapNoteRepository::class
        );
        $this->app->bind(
            \App\Repositories\Contracts\PrescriptionRepositoryInterface::class,
            \App\Repositories\PrescriptionRepository::class
        );
        $this->app->bind(
            \App\Repositories\Contracts\ReportRepositoryInterface::class,
            \App\Repositories\ReportRepository::class
        );
        $this->app->bind(
            \App\Repositories\Contracts\AiBriefRepositoryInterface::class,
            \App\Repositories\AiBriefRepository::class
        );
        $this->app->bind(
            \App\Repositories\Contracts\FollowupRepositoryInterface::class,
            \App\Repositories\FollowupRepository::class
        );
        $this->app->bind(
            \App\Repositories\Contracts\OutcomeRepositoryInterface::class,
            \App\Repositories\OutcomeRepository::class
        );
        $this->app->bind(
            \App\Repositories\Contracts\UserRepositoryInterface::class,
            \App\Repositories\UserRepository::class
        );
        $this->app->bind(
            \App\Repositories\Contracts\AnalyticsRepositoryInterface::class,
            \App\Repositories\AnalyticsRepository::class
        );
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
