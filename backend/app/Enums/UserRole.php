<?php

namespace App\Enums;

enum UserRole: string
{
    case SuperAdmin  = 'super_admin';
    case ClinicAdmin = 'clinic_admin';
    case Doctor      = 'doctor';
    case FrontDesk   = 'front_desk';
    case Patient     = 'patient';
}
