<?php

namespace App\Http\Controllers;

use App\Domain\Project\Models\Project;
use App\Domain\Workspace\Models\Document;
use App\Domain\Workspace\Services\AuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DocumentController extends Controller
{
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Document::class);

        $query = Document::query()
            ->with(['project:id,code,name', 'uploader:id,name'])
            ->latest('id');

        if ($search = $request->string('search')->trim()->toString()) {
            $query->where(function ($q) use ($search) {
                $q->whereLike('code', "%{$search}%", caseSensitive: false)
                    ->orWhereLike('title', "%{$search}%", caseSensitive: false)
                    ->orWhereLike('original_filename', "%{$search}%", caseSensitive: false);
            });
        }

        if ($category = $request->string('category')->trim()->toString()) {
            $query->where('category', $category);
        }

        $docs = $query->get();

        return Inertia::render('Documents/Index', [
            'documents' => $docs->map(fn (Document $d) => [
                'id' => $d->id,
                'code' => $d->code,
                'title' => $d->title,
                'category' => $d->category,
                'description' => $d->description,
                'project_code' => $d->project?->code,
                'project_name' => $d->project?->name,
                'original_filename' => $d->original_filename,
                'file_size' => $d->file_size,
                'version' => $d->version,
                'data_status' => $d->data_status,
                'uploader' => $d->uploader?->name,
                'created_at' => $d->created_at?->format('Y-m-d'),
            ]),
            'categories' => Document::CATEGORIES,
            'projects' => Project::query()->orderBy('code')->get(['id', 'code', 'name']),
            'filters' => [
                'search' => $request->string('search')->toString(),
                'category' => $request->string('category')->toString(),
            ],
            'canUpload' => $request->user()?->can('create', Document::class) ?? false,
        ]);
    }

    public function store(Request $request, AuditLogger $audit): RedirectResponse
    {
        $this->authorize('create', Document::class);

        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'category' => ['required', Rule::in(Document::CATEGORIES)],
            'description' => ['nullable', 'string', 'max:2000'],
            'project_id' => ['nullable', 'exists:projects,id'],
            'version' => ['required', 'string', 'max:20'],
            'data_status' => ['required', Rule::in(['Disepakati', 'Usulan', 'Perlu Konfirmasi Manajemen'])],
            'file' => ['required', 'file', 'max:25600'],
        ]);

        $file = $request->file('file');
        $path = $file->store('documents', 'local');

        $maxNum = Document::withTrashed()
            ->where('code', 'like', 'DOC-%')
            ->pluck('code')
            ->map(fn (string $c) => (int) str_replace('DOC-', '', $c))
            ->max() ?? 0;

        $doc = Document::create([
            'code' => sprintf('DOC-%03d', $maxNum + 1),
            'title' => $data['title'],
            'category' => $data['category'],
            'description' => $data['description'] ?? null,
            'project_id' => $data['project_id'] ?? null,
            'file_path' => $path,
            'original_filename' => $file->getClientOriginalName(),
            'mime_type' => $file->getMimeType(),
            'file_size' => $file->getSize(),
            'version' => $data['version'],
            'data_status' => $data['data_status'],
            'uploaded_by' => $request->user()->id,
        ]);

        $audit->log('document.uploaded', "Uploaded private document {$doc->code}: {$doc->title}.", $doc);

        return back()->with('success', "Document {$doc->code} uploaded to private vault.");
    }

    public function download(Document $document): StreamedResponse
    {
        $this->authorize('view', $document);
        abort_unless(Storage::disk('local')->exists($document->file_path), 404);

        return Storage::disk('local')->download($document->file_path, $document->original_filename);
    }

    public function destroy(Document $document, AuditLogger $audit): RedirectResponse
    {
        $this->authorize('delete', $document);
        $code = $document->code;
        $document->delete();
        $audit->log('document.deleted', "Deleted document {$code}.", $document);

        return back()->with('success', "Document {$code} archived.");
    }
}
