<?php

namespace App\Enums;

enum AppointmentStatus: string
{
    case Booked           = 'booked';
    case Confirmed        = 'confirmed';
    case InQueue          = 'in_queue';
    case InConsultation   = 'in_consultation';
    case Completed        = 'completed';
    case Cancelled        = 'cancelled';
    case NoShow           = 'no_show';
}
