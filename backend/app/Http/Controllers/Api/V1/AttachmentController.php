<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\UploadAttachmentRequest;
use App\Http\Resources\AttachmentResource;
use App\Models\Transaction;
use App\Models\TransactionAttachment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class AttachmentController extends Controller
{
    public function store(UploadAttachmentRequest $request, $id)
    {
        $transaction = Transaction::findOrFail($id);

        $file = $request->file('file');
        $path = $file->store('attachments', 'local');

        $attachment = TransactionAttachment::create([
            'transaction_id' => $transaction->id,
            'storage_path' => $path,
            'original_name' => $file->getClientOriginalName(),
            'mime_type' => $file->getClientMimeType(),
            'size_bytes' => $file->getSize(),
            'uploaded_by' => $request->user()->id,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Bukti transaksi berhasil diunggah.',
            'data' => new AttachmentResource($attachment),
        ], 201);
    }

    public function download(Request $request, $id, $attachmentId)
    {
        $attachment = TransactionAttachment::where('transaction_id', $id)->findOrFail($attachmentId);

        if (!Storage::disk('local')->exists($attachment->storage_path)) {
            return response()->json([
                'success' => false,
                'message' => 'File lampiran tidak ditemukan pada server.',
            ], 404);
        }

        return Storage::disk('local')->download($attachment->storage_path, $attachment->original_name, [
            'Content-Type' => $attachment->mime_type,
        ]);
    }
}
