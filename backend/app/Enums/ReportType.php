<?php

namespace App\Enums;

enum ReportType: string
{
    case BloodTest     = 'blood_test';
    case Audiogram     = 'audiogram';
    case CtScan        = 'ct_scan';
    case XRay          = 'xray';
    case Prescription  = 'prescription';
    case Other         = 'other';
}
