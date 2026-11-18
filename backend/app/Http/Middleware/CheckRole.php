<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{
    public function handle(Request $request, Closure $next, ...$roles): Response
    {
        $user = $request->user();

        if (!$user || !$user->role) {
            return response()->json([
                'success' => false,
                'message' => 'Anda belum terautentikasi.',
            ], 401);
        }

        if (!in_array($user->role->code, $roles)) {
            return response()->json([
                'success' => false,
                'message' => 'Anda tidak memiliki hak akses (permission) untuk tindakan ini.',
            ], 403);
        }

        return $next($request);
    }
}
