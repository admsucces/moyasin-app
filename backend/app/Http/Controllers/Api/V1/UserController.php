<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\CreateUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $query = User::with('role');

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if ($request->filled('role')) {
            $query->whereHas('role', function ($q) use ($request) {
                $q->where('code', $request->role);
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $perPage = min((int) ($request->get('per_page', 25)), 100);
        $users = $query->orderBy('id', 'desc')->paginate($perPage);

        return response()->json([
            'success' => true,
            'message' => 'Daftar pengguna berhasil diambil.',
            'data' => UserResource::collection($users->items()),
            'meta' => [
                'page' => $users->currentPage(),
                'per_page' => $users->perPage(),
                'total' => $users->total(),
                'total_pages' => $users->lastPage(),
            ],
        ]);
    }

    public function store(CreateUserRequest $request)
    {
        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => $request->password,
            'role_id' => $request->role_id,
            'status' => 'ACTIVE',
        ]);

        $user->load('role');

        return response()->json([
            'success' => true,
            'message' => 'Pengguna baru berhasil dibuat.',
            'data' => new UserResource($user),
        ], 201);
    }

    public function update(UpdateUserRequest $request, $id)
    {
        $user = User::findOrFail($id);

        $data = $request->only(['name', 'email', 'role_id']);
        if ($request->filled('password')) {
            $data['password'] = $request->password;
        }

        $user->update($data);
        $user->load('role');

        return response()->json([
            'success' => true,
            'message' => 'Data pengguna berhasil diperbarui.',
            'data' => new UserResource($user),
        ]);
    }

    public function toggleStatus(Request $request, $id)
    {
        $request->validate([
            'status' => 'required|in:ACTIVE,INACTIVE',
        ]);

        $user = User::findOrFail($id);
        $user->update(['status' => $request->status]);
        $user->load('role');

        return response()->json([
            'success' => true,
            'message' => "Status pengguna berhasil diubah menjadi {$user->status}.",
            'data' => new UserResource($user),
        ]);
    }
}
