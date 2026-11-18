<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AppSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    public static function getDefaults(): array
    {
        return [
            'app_name'               => 'Curadoc',
            'app_badge'              => 'MONEY',
            'organization_name'      => 'Yayasan ISAK 35',
            'organization_full_name' => 'YAYASAN ISAK 35 INDONESIA',
            'organization_tagline'   => 'Yayasan Yatim Piatu, Dhuafa, dan Lansia',
            'organization_address'   => 'Jl. Sosial Kemanusiaan No. 35, Indonesia',
            'organization_phone'     => '(021) 555-0135',
            'organization_email'     => 'keuangan@yayasan-isak35.or.id',
            'logo_url'               => '',
            'logo_icon'              => 'Sparkles',
            'theme_preset'           => 'indigo',
            'primary_color'          => '#4935e4',
            'secondary_color'        => '#331ea0',
            'accent_color'           => '#67e8f9',
            'bg_color'               => '#f3f5fd',
            'report_preparer_name'   => 'Staf Akuntansi & Keuangan',
            'report_preparer_role'   => 'Bagian Keuangan Yayasan',
            'report_approver_name'   => 'Ketua Pengurus Yayasan',
            'report_approver_role'   => 'Pimpinan Lembaga',
            'show_sidebar_promo'     => 'true',
        ];
    }

    public function index(): JsonResponse
    {
        $defaults = self::getDefaults();
        $stored = AppSetting::pluck('value', 'key')->toArray();

        $merged = array_merge($defaults, $stored);

        return response()->json([
            'success' => true,
            'data'    => $merged,
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $allowedKeys = array_keys(self::getDefaults());
        $input = $request->only($allowedKeys);

        foreach ($input as $key => $value) {
            AppSetting::updateOrCreate(
                ['key' => $key],
                ['value' => is_null($value) ? '' : (string) $value]
            );
        }

        $defaults = self::getDefaults();
        $stored = AppSetting::pluck('value', 'key')->toArray();
        $merged = array_merge($defaults, $stored);

        return response()->json([
            'success' => true,
            'message' => 'Pengaturan aplikasi berhasil disimpan.',
            'data'    => $merged,
        ]);
    }
}

