<?php

namespace App\Domain\Crm\Services;

use App\Domain\Crm\Models\Company;
use App\Domain\Crm\Models\Contact;
use App\Domain\Crm\Models\Lead;
use App\Domain\Crm\Models\PipelineHistory;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Shared\Date as ExcelDate;
use RuntimeException;

class CrmWorkbookImporter
{
    /**
     * Imports Sheet 08 Sales & Client Pipeline (55 baseline prospects) idempotently.
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
            $reader->setLoadSheetsOnly(['08 Sales & Client Pipeline']);
        }
        $spreadsheet = $reader->load($filePath);
        $sheet = $spreadsheet->getSheetByName('08 Sales & Client Pipeline');
        if (! $sheet) {
            $spreadsheet->disconnectWorksheets();
            unset($spreadsheet);
            throw new RuntimeException('Sheet "08 Sales & Client Pipeline" not found.');
        }

        $usersByName = User::query()->get()->keyBy(fn (User $u) => mb_strtolower(trim($u->name)));
        $defaultPic = $usersByName->get('albert christian') ?? User::firstOrFail();

        $summary = [
            'companies_created' => 0,
            'leads_created' => 0,
            'leads_skipped' => 0,
            'needs_confirmation' => 0,
        ];

        DB::transaction(function () use ($sheet, $usersByName, $defaultPic, $preserveExisting, &$summary): void {
            for ($r = 6; $r <= 105; $r++) {
                $companyName = trim((string) $sheet->getCell("B{$r}")->getCalculatedValue());
                if ($companyName === '') {
                    continue;
                }

                $externalNo = (int) ($sheet->getCell("A{$r}")->getCalculatedValue() ?: ($r - 5));
                $code = sprintf('L-%03d', $externalNo);

                $existingLead = Lead::withTrashed()->where('code', $code)->first();
                if ($existingLead && $preserveExisting) {
                    $summary['leads_skipped']++;

                    continue;
                }

                $industry = trim((string) $sheet->getCell("C{$r}")->getCalculatedValue()) ?: 'Organisasi / Lainnya';
                $rawContact = trim((string) $sheet->getCell("D{$r}")->getCalculatedValue());
                $decisionMakerTitle = trim((string) $sheet->getCell("E{$r}")->getCalculatedValue());
                $website = trim((string) $sheet->getCell("F{$r}")->getCalculatedValue()) ?: null;
                $needs = trim((string) $sheet->getCell("G{$r}")->getCalculatedValue()) ?: null;
                $serviceLine = trim((string) $sheet->getCell("H{$r}")->getCalculatedValue()) ?: 'Belum ditentukan';
                $source = trim((string) $sheet->getCell("I{$r}")->getCalculatedValue()) ?: 'Dokumen prospek lama';
                $stage = trim((string) $sheet->getCell("J{$r}")->getCalculatedValue()) ?: 'Lead Identified';
                $picName = mb_strtolower(trim((string) $sheet->getCell("K{$r}")->getCalculatedValue()));
                $pic = $usersByName->get($picName) ?? $defaultPic;

                $contactedAt = $this->parseDate($sheet->getCell("L{$r}")->getCalculatedValue());
                $nextFollowUpAt = $this->parseDate($sheet->getCell("M{$r}")->getCalculatedValue());
                $rawValue = $sheet->getCell("N{$r}")->getCalculatedValue();
                $estimatedValue = is_numeric($rawValue) ? (float) $rawValue : null;
                $notes = trim((string) $sheet->getCell("O{$r}")->getCalculatedValue()) ?: null;
                $discoveryAt = $this->parseDate($sheet->getCell("P{$r}")->getCalculatedValue());
                $proposalAt = $this->parseDate($sheet->getCell("Q{$r}")->getCalculatedValue());
                $closedAt = $this->parseDate($sheet->getCell("R{$r}")->getCalculatedValue());
                $dataStatus = trim((string) $sheet->getCell("S{$r}")->getCalculatedValue()) ?: 'Disepakati';

                if ($dataStatus !== 'Disepakati') {
                    $summary['needs_confirmation']++;
                }

                $email = null;
                $phone = null;
                if ($rawContact !== '') {
                    if (str_contains($rawContact, '@')) {
                        $email = $rawContact;
                    } else {
                        $phone = $rawContact;
                    }
                }

                $company = Company::firstOrCreate(
                    ['name' => $companyName],
                    [
                        'industry' => $industry,
                        'location' => 'Pekanbaru',
                        'phone' => $phone,
                        'email' => $email,
                        'website' => $website,
                    ]
                );

                if ($company->wasRecentlyCreated) {
                    $summary['companies_created']++;
                }

                $contact = null;
                if ($rawContact !== '' || $decisionMakerTitle !== '') {
                    $contact = Contact::firstOrCreate(
                        [
                            'company_id' => $company->id,
                            'name' => $decisionMakerTitle !== '' ? $decisionMakerTitle : $companyName.' Contact',
                        ],
                        [
                            'role_title' => $decisionMakerTitle ?: null,
                            'email' => $email,
                            'phone' => $phone,
                            'is_decision_maker' => $decisionMakerTitle !== '',
                        ]
                    );
                }

                $lead = Lead::updateOrCreate(
                    ['code' => $code],
                    [
                        'external_no' => $externalNo,
                        'company_id' => $company->id,
                        'primary_contact_id' => $contact?->id,
                        'potential_needs' => $needs,
                        'service_line' => $serviceLine,
                        'source' => $source,
                        'stage' => $stage,
                        'pic_user_id' => $pic->id,
                        'contacted_at' => $contactedAt,
                        'next_follow_up_at' => $nextFollowUpAt,
                        'estimated_value' => $estimatedValue,
                        'discovery_meeting_at' => $discoveryAt,
                        'proposal_sent_at' => $proposalAt,
                        'closed_at' => $closedAt,
                        'data_status' => $dataStatus,
                        'notes' => $notes,
                    ]
                );

                if (! $lead->pipelineHistories()->exists()) {
                    PipelineHistory::create([
                        'lead_id' => $lead->id,
                        'from_stage' => null,
                        'to_stage' => $stage,
                        'changed_by' => $pic->id,
                        'evidence_note' => 'Imported from 08 Sales & Client Pipeline workbook',
                        'changed_at' => now(),
                    ]);
                }

                $summary['leads_created']++;
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
