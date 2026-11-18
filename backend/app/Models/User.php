<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'role_id',
        'name',
        'email',
        'password',
        'status',
        'last_login_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'last_login_at' => 'datetime',
        ];
    }

    public function role()
    {
        return $this->belongsTo(Role::class);
    }

    public function isActive(): bool
    {
        return $this->status === 'ACTIVE';
    }

    public function isAdmin(): bool
    {
        return $this->role && $this->role->code === 'ADMIN';
    }

    public function isPengelola(): bool
    {
        return $this->role && in_array($this->role->code, ['PENGELOLA', 'MANAGER', 'OPERATOR']);
    }

    public function isOwner(): bool
    {
        return $this->role && $this->role->code === 'OWNER';
    }
}
