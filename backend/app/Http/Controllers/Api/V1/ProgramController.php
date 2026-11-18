<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\CreateProgramRequest;
use App\Http\Resources\ProgramResource;
use App\Models\AuditLog;
use App\Models\JournalEntry;
use App\Models\Program;
use App\Models\Transaction;
use Illuminate\Http\Request;

class ProgramController extends Controller
{
    public function index(Request $request)
    {
        $query = Program::query();

        if ($request->filled('is_active')) {
            $query->where('is_active', filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN));
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('code', 'like', "%{$search}%")
                  ->orWhere('name', 'like', "%{$search}%");
            });
        }

        $programs = $query->orderBy('code', 'asc')->get();

        return response()->json([
            'success' => true,
            'message' => 'Daftar program yayasan berhasil diambil.',
            'data' => ProgramResource::collection($programs),
        ]);
    }

    public function store(CreateProgramRequest $request)
    {
        $data = array_merge([
            'is_active' => true,
        ], $request->validated());

        $program = Program::create($data);

        return response()->json([
            'success' => true,
            'message' => 'Program baru berhasil dibuat.',
            'data' => new ProgramResource($program),
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $request->validate([
            'name' => 'required|string|max:150',
            'description' => 'nullable|string',
        ]);

        $program = Program::findOrFail($id);
        $program->update($request->only(['name', 'description']));

        return response()->json([
            'success' => true,
            'message' => 'Data program berhasil diperbarui.',
            'data' => new ProgramResource($program),
        ]);
    }

    public function deactivate($id)
    {
        $program = Program::findOrFail($id);
        $program->update(['is_active' => false]);

        return response()->json([
            'success' => true,
            'message' => 'Program berhasil dinonaktifkan.',
            'data' => new ProgramResource($program),
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $program = Program::findOrFail($id);

        if (Transaction::where('program_id', $program->id)->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Program tidak dapat dihapus permanen karena sudah memiliki riwayat transaksi penerimaan/pengeluaran. Silakan gunakan opsi Nonaktifkan.',
            ], 422);
        }

        if (JournalEntry::where('program_id', $program->id)->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Program tidak dapat dihapus permanen karena sudah memiliki riwayat jurnal buku besar. Silakan gunakan opsi Nonaktifkan.',
            ], 422);
        }

        $code = $program->code;
        $name = $program->name;

        $program->delete();

        AuditLog::create([
            'user_id' => $request->user()?->id,
            'action' => 'PROGRAM_DELETED',
            'entity_type' => 'Program',
            'entity_id' => $id,
            'description' => "Program [{$code}] {$name} telah dihapus.",
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'success' => true,
            'message' => "Program [{$code}] {$name} berhasil dihapus.",
        ]);
    }
}
