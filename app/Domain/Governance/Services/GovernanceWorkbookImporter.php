<?php

namespace App\Domain\Governance\Services;

use App\Domain\Governance\Models\Decision;
use App\Domain\Governance\Models\Meeting;
use App\Domain\Governance\Models\MeetingForum;
use App\Domain\Governance\Models\QuarterlyReview;
use App\Domain\Governance\Models\Risk;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Shared\Date as ExcelDate;
use RuntimeException;

class GovernanceWorkbookImporter
{
    /**
     * Imports Sheet 14 (17 Risks R-01..R-17 & 13 Decisions D-01..D-13)
     * and Sheet 15 (6 Meeting Forums, 16 Planned Evaluation Meetings, 5 Quarterly Reviews).
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
            $reader->setLoadSheetsOnly(['14 Risk & Decision Log', '15 Meeting & Evaluation']);
        }
        $spreadsheet = $reader->load($filePath);

        $usersByName = User::query()->get()->keyBy(fn (User $u) => mb_strtolower(trim($u->name)));
        $defaultAdmin = $usersByName->get('albert christian') ?? User::firstOrFail();

        $summary = [
            'risks_created' => 0,
            'risks_skipped' => 0,
            'decisions_created' => 0,
            'decisions_skipped' => 0,
            'forums_synced' => 0,
            'meetings_created' => 0,
            'meetings_skipped' => 0,
            'quarterly_synced' => 0,
        ];

        DB::transaction(function () use ($spreadsheet, $usersByName, $defaultAdmin, $preserveExisting, &$summary): void {
            // 1. Sheet 14 Risk & Decision Log
            $s14 = $spreadsheet->getSheetByName('14 Risk & Decision Log');
            if ($s14) {
                for ($r = 6; $r <= 25; $r++) {
                    $code = trim((string) $s14->getCell("A{$r}")->getCalculatedValue());
                    if (! preg_match('/^R-\d+$/', $code)) {
                        continue;
                    }

                    $existing = Risk::withTrashed()->where('code', $code)->first();
                    if ($existing && $preserveExisting) {
                        $summary['risks_skipped']++;

                        continue;
                    }

                    $likelihood = max(1, min(5, (int) $s14->getCell("D{$r}")->getCalculatedValue()));
                    $impact = max(1, min(5, (int) $s14->getCell("E{$r}")->getCalculatedValue()));
                    $score = $likelihood * $impact;
                    $picName = mb_strtolower(trim((string) $s14->getCell("H{$r}")->getCalculatedValue()));
                    $pic = $usersByName->get($picName) ?? $defaultAdmin;

                    Risk::updateOrCreate(
                        ['code' => $code],
                        [
                            'category' => trim((string) $s14->getCell("B{$r}")->getCalculatedValue()) ?: 'Operasional',
                            'title' => trim((string) $s14->getCell("C{$r}")->getCalculatedValue()),
                            'likelihood' => $likelihood,
                            'impact' => $impact,
                            'score' => $score,
                            'level' => Risk::resolveLevel($score),
                            'pic_user_id' => $pic->id,
                            'mitigation_plan' => trim((string) $s14->getCell("I{$r}")->getCalculatedValue()),
                            'contingency_plan' => trim((string) $s14->getCell("J{$r}")->getCalculatedValue()) ?: null,
                            'status' => trim((string) $s14->getCell("K{$r}")->getCalculatedValue()) ?: 'Open',
                        ]
                    );
                    $summary['risks_created']++;
                }

                for ($r = 30; $r <= 50; $r++) {
                    $code = trim((string) $s14->getCell("A{$r}")->getCalculatedValue());
                    if (! preg_match('/^D-\d+$/', $code)) {
                        continue;
                    }

                    $existing = Decision::withTrashed()->where('code', $code)->first();
                    if ($existing && $preserveExisting) {
                        $summary['decisions_skipped']++;

                        continue;
                    }

                    $picName = mb_strtolower(trim((string) $s14->getCell("H{$r}")->getCalculatedValue()));
                    $pic = $usersByName->get($picName) ?? $defaultAdmin;
                    $status = trim((string) $s14->getCell("F{$r}")->getCalculatedValue()) ?: 'Open';
                    $dataStatus = trim((string) $s14->getCell("J{$r}")->getCalculatedValue()) ?: 'Disepakati';

                    Decision::updateOrCreate(
                        ['code' => $code],
                        [
                            'decision_date' => $this->parseDate($s14->getCell("B{$r}")->getCalculatedValue()),
                            'topic_decision' => trim((string) $s14->getCell("C{$r}")->getCalculatedValue()),
                            'deadline' => $this->parseDate($s14->getCell("D{$r}")->getCalculatedValue()),
                            'status' => $status,
                            'pic_user_id' => $pic->id,
                            'follow_up' => trim((string) $s14->getCell("I{$r}")->getCalculatedValue()) ?: null,
                            'data_status' => $dataStatus,
                            'approved_by' => $status === 'Done' ? $defaultAdmin->id : null,
                            'approved_at' => $status === 'Done' ? now() : null,
                        ]
                    );
                    $summary['decisions_created']++;
                }
            }

            // 2. Sheet 15 Meeting & Evaluation
            $s15 = $spreadsheet->getSheetByName('15 Meeting & Evaluation');
            if ($s15) {
                $forumsByName = [];
                for ($r = 6; $r <= 11; $r++) {
                    $no = trim((string) $s15->getCell("A{$r}")->getCalculatedValue());
                    $name = trim((string) $s15->getCell("B{$r}")->getCalculatedValue());
                    if ($no === '' || $name === '') {
                        continue;
                    }

                    $picName = mb_strtolower(trim((string) $s15->getCell("I{$r}")->getCalculatedValue()));
                    $pic = $usersByName->get($picName) ?? $defaultAdmin;

                    $forum = MeetingForum::updateOrCreate(
                        ['code' => sprintf('FRM-%02d', (int) $no)],
                        [
                            'name' => $name,
                            'purpose' => trim((string) $s15->getCell("C{$r}")->getCalculatedValue()) ?: null,
                            'frequency' => trim((string) $s15->getCell("D{$r}")->getCalculatedValue()),
                            'duration' => trim((string) $s15->getCell("E{$r}")->getCalculatedValue()),
                            'participants' => trim((string) $s15->getCell("F{$r}")->getCalculatedValue()) ?: null,
                            'standard_agenda' => trim((string) $s15->getCell("G{$r}")->getCalculatedValue()) ?: null,
                            'required_output' => trim((string) $s15->getCell("H{$r}")->getCalculatedValue()) ?: null,
                            'pic_user_id' => $pic->id,
                        ]
                    );
                    $forumsByName[$name] = $forum;
                    $summary['forums_synced']++;
                }

                for ($r = 23; $r <= 38; $r++) {
                    $no = trim((string) $s15->getCell("A{$r}")->getCalculatedValue());
                    $forumName = trim((string) $s15->getCell("B{$r}")->getCalculatedValue());
                    if ($no === '' || $forumName === '') {
                        continue;
                    }

                    $code = sprintf('MTG-%03d', (int) $no);
                    $existing = Meeting::withTrashed()->where('code', $code)->first();
                    if ($existing && $preserveExisting) {
                        $summary['meetings_skipped']++;

                        continue;
                    }

                    $picName = mb_strtolower(trim((string) $s15->getCell("F{$r}")->getCalculatedValue()));
                    $pic = $usersByName->get($picName) ?? $defaultAdmin;
                    $forum = $forumsByName[$forumName] ?? null;

                    Meeting::updateOrCreate(
                        ['code' => $code],
                        [
                            'forum_id' => $forum?->id,
                            'forum_name' => $forumName,
                            'focus' => trim((string) $s15->getCell("C{$r}")->getCalculatedValue()),
                            'scheduled_date' => $this->parseDate($s15->getCell("D{$r}")->getCalculatedValue()) ?? now()->toDateString(),
                            'scheduled_time' => '09:00',
                            'status' => trim((string) $s15->getCell("E{$r}")->getCalculatedValue()) ?: 'Planned',
                            'pic_user_id' => $pic->id,
                            'agenda' => $forum?->standard_agenda,
                        ]
                    );
                    $summary['meetings_created']++;
                }

                for ($r = 58; $r <= 62; $r++) {
                    $no = trim((string) $s15->getCell("A{$r}")->getCalculatedValue());
                    $quarter = trim((string) $s15->getCell("B{$r}")->getCalculatedValue());
                    if ($no === '' || $quarter === '') {
                        continue;
                    }

                    QuarterlyReview::updateOrCreate(
                        ['quarter_label' => $quarter],
                        [
                            'sort_order' => (int) $no,
                            'review_focus' => trim((string) $s15->getCell("C{$r}")->getCalculatedValue()),
                            'period_range' => trim((string) $s15->getCell("D{$r}")->getCalculatedValue()),
                            'status' => trim((string) $s15->getCell("F{$r}")->getCalculatedValue()) ?: 'Planned',
                        ]
                    );
                    $summary['quarterly_synced']++;
                }
            }
        });

        $spreadsheet->disconnectWorksheets();
        unset($spreadsheet);
        gc_collect_cycles();

        return $summary;
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
