<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Support\Facades\Request;

class AuditLogService
{
    /**
     * Record an audit log event.
     *
     * @param User|int|null $user
     * @param string $action
     * @param string|null $entityType
     * @param int|null $entityId
     * @param string|null $description
     * @return AuditLog
     */
    public static function log($user, string $action, ?string $entityType = null, ?int $entityId = null, ?string $description = null): AuditLog
    {
        $userId = $user instanceof User ? $user->id : $user;

        return AuditLog::create([
            'user_id' => $userId,
            'action' => strtoupper($action),
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'description' => $description,
            'ip_address' => Request::ip() ?: '127.0.0.1',
            'user_agent' => substr(Request::header('User-Agent') ?: 'System', 0, 255),
            'created_at' => now(),
        ]);
    }
}
