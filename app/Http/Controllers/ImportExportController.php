<?php

namespace App\Http\Controllers;

use App\Domain\Workspace\Models\ImportBatch;
use App\Domain\Workspace\Services\FullWorkbookOrchestratorService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class ImportExportController extends Controller
{
    public function index(Request $request): Response
    {
        abort_unless($request->user()?->hasPermissionTo('imports.manage'), 403);

        $batches = ImportBatch::query()
            ->with('importer:id,name')
            ->latest('id')
            ->limit(25)
            ->get();

        return Inertia::render('Admin/ImportExport', [
            'batches' => $batches->map(fn (ImportBatch $b) => [
                'id' => $b->id,
                'filename' => $b->filename,
                'mode' => $b->mode,
                'preserve_existing' => $b->preserve_existing,
                'summary_json' => $b->summary_json,
                'importer' => $b->importer?->name ?? 'CLI / Seeder',
                'created_at' => $b->created_at?->format('Y-m-d H:i'),
            ]),
            'defaultWorkbookAvailable' => is_file(storage_path('app/private/seed/workplan_2026_2027.xlsx')),
        ]);
    }

    public function runImport(Request $request, FullWorkbookOrchestratorService $orchestrator): RedirectResponse
    {
        abort_unless($request->user()?->hasPermissionTo('imports.manage'), 403);

        $data = $request->validate([
            'mode' => ['required', 'in:dry_run,apply'],
            'preserve_existing' => ['required', 'boolean'],
            'workbook' => ['nullable', 'file', 'mimes:xlsx,xls', 'max:20480'],
        ]);

        if ($request->hasFile('workbook')) {
            $file = $request->file('workbook');
            $path = $file->getRealPath();
            $displayName = $file->getClientOriginalName();
        } else {
            $path = storage_path('app/private/seed/workplan_2026_2027.xlsx');
            $displayName = 'workplan_2026_2027.xlsx';
        }

        if (! is_file($path)) {
            return back()->withErrors(['workbook' => 'No workbook file found. Upload an .xlsx file to import.']);
        }

        $result = $orchestrator->runImport(
            $path,
            $data['mode'] === 'dry_run',
            (bool) $data['preserve_existing'],
            $request->user(),
            $displayName
        );

        return back()->with('success', ($data['mode'] === 'dry_run' ? 'Dry-run preview completed' : 'Workbook imported') . " ({$displayName}).");
    }

    public function export(Request $request, FullWorkbookOrchestratorService $orchestrator): BinaryFileResponse
    {
        abort_unless($request->user()?->hasPermissionTo('imports.manage'), 403);
        $path = $orchestrator->exportLiveWorkbook();

        return response()->download($path, basename($path))->deleteFileAfterSend(true);
    }
}
