<?php

namespace App\Domain\Portfolio\Services;

use App\Domain\Marketing\Models\ContentItem;
use App\Domain\Portfolio\Models\DemoProduct;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Shared\Date as ExcelDate;
use RuntimeException;

class PortfolioAndMarketingWorkbookImporter
{
    public function __construct(private readonly DemoReadinessService $demoService) {}

    /**
     * Imports Sheet 10 (PD-01..PD-06) and Sheet 11 (C-001..C-158) idempotently.
     *
     * @return array<string, int>
     */
    public function import(string $filePath, bool $preserveExisting = true): array
    {
        if (! is_file($filePath)) {
            throw new RuntimeException("Workbook file not found at {$filePath}");
        }

        $reader = IOFactory::createReaderForFile($filePath);
        $reader->setReadDataOnly(true);
        if (method_exists($reader, 'setLoadSheetsOnly')) {
            $reader->setLoadSheetsOnly(['10 Portfolio & Demo Roadmap', '11 Marketing & Social Media']);
        }
        $spreadsheet = $reader->load($filePath);

        $usersByName = User::query()->get()->keyBy(fn (User $u) => mb_strtolower(trim($u->name)));
        $defaultAdmin = $usersByName->get('albert christian') ?? User::firstOrFail();
        $jihanz = $usersByName->get('jihanz fairuz tsani') ?? $defaultAdmin;

        $summary = [
            'demos_created' => 0,
            'demos_skipped' => 0,
            'contents_created' => 0,
            'contents_skipped' => 0,
        ];

        DB::transaction(function () use ($spreadsheet, $usersByName, $defaultAdmin, $jihanz, $preserveExisting, &$summary): void {
            // 1. Sheet 10 Portfolio & Demo Roadmap (rows 6..11)
            $demoSheet = $spreadsheet->getSheetByName('10 Portfolio & Demo Roadmap');
            if ($demoSheet) {
                for ($r = 6; $r <= 11; $r++) {
                    $code = trim((string) $demoSheet->getCell("A{$r}")->getCalculatedValue());
                    if ($code === '' || ! str_starts_with($code, 'PD-')) {
                        continue;
                    }

                    $existing = DemoProduct::withTrashed()->where('code', $code)->first();
                    if ($existing && $preserveExisting) {
                        $this->demoService->seedCriteriaForDemo($existing);
                        $summary['demos_skipped']++;

                        continue;
                    }

                    $picName = mb_strtolower(trim((string) $demoSheet->getCell("F{$r}")->getCalculatedValue()));
                    $pic = $usersByName->get($picName) ?? $defaultAdmin;
                    $featuresRaw = trim((string) $demoSheet->getCell("E{$r}")->getCalculatedValue());
                    $notesRaw = trim((string) $demoSheet->getCell("K{$r}")->getCalculatedValue()) ?: null;

                    $isConditional = $code === 'PD-06'
                        || str_contains(mb_strtolower($featuresRaw), 'perlu konfirmasi')
                        || str_contains(mb_strtolower((string) $notesRaw), 'bersyarat');

                    $dataStatus = str_contains(mb_strtolower($featuresRaw), 'perlu konfirmasi')
                        ? 'Perlu Konfirmasi Manajemen'
                        : 'Disepakati';

                    $checklistItems = collect(preg_split('/[;,]/', $featuresRaw) ?: [])
                        ->map(fn (string $s) => trim($s))
                        ->filter()
                        ->map(fn (string $s) => ['title' => $s, 'done' => false])
                        ->values()
                        ->all();

                    $demo = DemoProduct::updateOrCreate(
                        ['code' => $code],
                        [
                            'name' => trim((string) $demoSheet->getCell("B{$r}")->getCalculatedValue()),
                            'service_line' => trim((string) $demoSheet->getCell("C{$r}")->getCalculatedValue()) ?: 'Website Development & CMS',
                            'purpose' => trim((string) $demoSheet->getCell("D{$r}")->getCalculatedValue()) ?: null,
                            'features_summary' => $featuresRaw ?: null,
                            'feature_checklist' => $checklistItems,
                            'qa_checklist' => [
                                ['title' => 'Staging environment deployed', 'done' => false],
                                ['title' => 'Responsive mobile 390px & desktop 1280px checked', 'done' => false],
                                ['title' => 'Zero critical or high bugs open', 'done' => false],
                            ],
                            'pic_user_id' => $pic->id,
                            'supporting_team' => trim((string) $demoSheet->getCell("G{$r}")->getCalculatedValue()) ?: null,
                            'start_date' => $this->parseDate($demoSheet->getCell("H{$r}")->getCalculatedValue()),
                            'target_end_date' => $this->parseDate($demoSheet->getCell("I{$r}")->getCalculatedValue()),
                            'status' => trim((string) $demoSheet->getCell("J{$r}")->getCalculatedValue()) ?: 'Not Started',
                            'label_type' => 'contoh internal',
                            'client_permission_granted' => false,
                            'is_conditional' => $isConditional,
                            'data_status' => $dataStatus,
                            'notes' => $notesRaw,
                        ]
                    );

                    $this->demoService->seedCriteriaForDemo($demo);
                    $summary['demos_created']++;
                }
            }

            $demosByCode = DemoProduct::query()->pluck('id', 'code');

            // 2. Sheet 11 Marketing & Social Media (rows 6..200 matching C-XXX)
            $mktSheet = $spreadsheet->getSheetByName('11 Marketing & Social Media');
            if ($mktSheet) {
                $highestRow = min(200, (int) $mktSheet->getHighestRow());
                for ($r = 6; $r <= $highestRow; $r++) {
                    $code = trim((string) $mktSheet->getCell("A{$r}")->getCalculatedValue());
                    if (! preg_match('/^C-\d+$/', $code)) {
                        continue;
                    }

                    $existingContent = ContentItem::withTrashed()->where('code', $code)->first();
                    if ($existingContent && $preserveExisting) {
                        $summary['contents_skipped']++;

                        continue;
                    }

                    $platform = trim((string) $mktSheet->getCell("E{$r}")->getCalculatedValue());
                    $category = trim((string) $mktSheet->getCell("F{$r}")->getCalculatedValue());
                    $topic = trim((string) $mktSheet->getCell("G{$r}")->getCalculatedValue());

                    $picName = mb_strtolower(trim((string) $mktSheet->getCell("H{$r}")->getCalculatedValue()));
                    $reviewerName = mb_strtolower(trim((string) $mktSheet->getCell("I{$r}")->getCalculatedValue()));
                    $pic = $usersByName->get($picName) ?? $jihanz;

                    $reviewer = $usersByName->get($reviewerName);
                    if (! $reviewer && isset(ContentItem::CATEGORY_REVIEWER_EMAILS[$category])) {
                        $reviewer = User::where('email', ContentItem::CATEGORY_REVIEWER_EMAILS[$category])->first();
                    }

                    $demoId = $this->resolveLinkedDemoId($category, $topic, $demosByCode->all());
                    $isReused = $platform === 'TikTok' || str_contains(mb_strtolower($topic), 'pakai ulang reels');

                    ContentItem::updateOrCreate(
                        ['code' => $code],
                        [
                            'demo_product_id' => $demoId,
                            'platform' => $platform,
                            'category' => $category,
                            'title_topic' => $topic,
                            'pic_user_id' => $pic->id,
                            'reviewer_user_id' => $reviewer?->id ?? $defaultAdmin->id,
                            'production_date' => $this->parseDate($mktSheet->getCell("B{$r}")->getCalculatedValue()),
                            'review_date' => $this->parseDate($mktSheet->getCell("C{$r}")->getCalculatedValue()),
                            'publish_date' => $this->parseDate($mktSheet->getCell("D{$r}")->getCalculatedValue()),
                            'status' => trim((string) $mktSheet->getCell("J{$r}")->getCalculatedValue()) ?: 'Planned',
                            'is_reused_reel' => $isReused,
                            'data_status' => 'Disepakati',
                            'notes' => trim((string) $mktSheet->getCell("K{$r}")->getCalculatedValue()) ?: null,
                        ]
                    );

                    $summary['contents_created']++;
                }
            }
        });

        $spreadsheet->disconnectWorksheets();
        unset($spreadsheet);
        gc_collect_cycles();

        return $summary;
    }

    /**
     * @param  array<string, int>  $demosByCode
     */
    private function resolveLinkedDemoId(string $category, string $topic, array $demosByCode): ?int
    {
        if (! in_array($category, ContentItem::DEMO_GATED_CATEGORIES, true)) {
            return null;
        }

        $lower = mb_strtolower($topic);
        if (str_contains($lower, 'school') || str_contains($lower, 'sekolah')) {
            return $demosByCode['PD-02'] ?? null;
        }
        if (str_contains($lower, 'landing page')) {
            return $demosByCode['PD-03'] ?? null;
        }
        if (str_contains($lower, 'corporate')) {
            return $demosByCode['PD-01'] ?? null;
        }
        if (str_contains($lower, 'hrms') || str_contains($lower, 'administrasi') || str_contains($lower, 'cuti')) {
            return $demosByCode['PD-05'] ?? null;
        }
        if (str_contains($lower, 'business management') || str_contains($lower, 'sistem')) {
            return $demosByCode['PD-04'] ?? null;
        }

        return match ($category) {
            'Portfolio Showcase' => $demosByCode['PD-01'] ?? null,
            'Demo Product' => $demosByCode['PD-04'] ?? null,
            default => $demosByCode['PD-01'] ?? null,
        };
    }

    private function parseDate(mixed $raw): ?string
    {
        if ($raw === null || $raw === '') {
            return null;
        }
        if (is_numeric($raw)) {
            return ExcelDate::excelToDateTimeObject((float) $raw)->format('Y-m-d');
        }
        try {
            return Carbon::parse((string) $raw)->format('Y-m-d');
        } catch (\Throwable) {
            return null;
        }
    }
}
