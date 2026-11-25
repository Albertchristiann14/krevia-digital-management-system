<?php

namespace App\Domain\Project\Services;

use App\Domain\Project\Models\Project;
use App\Domain\Project\Models\ProjectStage;
use App\Domain\Workspace\Services\AuditLogger;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ProjectStageGateService
{
    public const DOD_CHECKLIST = [
        '1. Task has PIC, deadline, and verifiable expected result',
        '2. Completion evidence attached (link, file, or commit)',
        '3. Feature passes acceptance criteria from requirement document',
        '4. Tested on staging and responsive on mobile (390px) & desktop (1280px)',
        '5. Zero open critical or high severity bugs',
        '6. Code review completed and zero credentials in repository',
        '7. User documentation updated; backup and rollback plan prepared',
        '8. QA gate approval recorded by Operations / CTO',
    ];

    public function __construct(private readonly AuditLogger $audit) {}

    public function seedStagesForProject(Project $project): void
    {
        $usersByEmail = User::query()->pluck('id', 'email');
        $albertId = $usersByEmail['albert@kreviadigital.com'] ?? null;
        $febrianaId = $usersByEmail['febriana@kreviadigital.com'] ?? null;
        $aldoId = $usersByEmail['aldo@kreviadigital.com'] ?? null;
        $anantaId = $usersByEmail['ananta@kreviadigital.com'] ?? null;
        $yogaId = $usersByEmail['yoga@kreviadigital.com'] ?? null;

        $stages = $project->service_line === Project::SERVICE_WEBSITE
            ? [
                [1, 'Initial Consultation', 'Memahami kebutuhan awal dan kelayakan kerja sama', 'Catatan konsultasi awal', 'Catatan tersimpan; keputusan lanjut/tidak tercatat', $albertId],
                [2, 'Requirement Gathering', 'Mengetahui tujuan, struktur, dan konten website', 'Dokumen requirement website', 'Dokumen disetujui klien secara tertulis', $febrianaId],
                [3, 'Proposal & Quotation', 'Menyampaikan lingkup, jadwal, dan harga yang jelas', 'Proposal dan quotation', 'Proposal dikirim; harga disetujui Albert', $albertId],
                [4, 'Agreement', 'Menyepakati lingkup, termin, dan aturan perubahan', 'Kesepakatan tertulis', 'Kesepakatan ditandatangani kedua pihak', $albertId],
                [5, 'UI/UX Design', 'Menyusun tampilan dan alur halaman yang disetujui klien', 'Desain disetujui', 'Persetujuan desain tertulis dari klien', $aldoId],
                [6, 'Development', 'Membangun website sesuai desain dan requirement', 'Website di staging', 'Fitur lulus acceptance criteria; kode ter-review', $anantaId],
                [7, 'CMS Integration', 'Membuat klien dapat mengelola konten sendiri', 'CMS berjalan dan teruji', 'Peran akses lulus uji; konten dapat diperbarui klien', $yogaId],
                [8, 'Testing & QA', 'Memastikan kualitas sebelum diuji klien', 'Laporan uji dan daftar bug', 'Tidak ada bug kritis/tinggi; QA gate lulus', $aldoId],
                [9, 'UAT', 'Klien memastikan hasil sesuai kebutuhan', 'Hasil UAT tertulis', 'Klien menyetujui UAT; perbaikan tercatat', $febrianaId],
                [10, 'Deployment', 'Menayangkan website sesuai kesepakatan domain dan hosting', 'Website live', 'Website dapat diakses; backup dan rollback tersedia', $yogaId],
                [11, 'Handover', 'Menyerahkan hasil, akses, dan panduan', 'Dokumen handover', 'Berita acara serah terima ditandatangani', $febrianaId],
                [12, 'Maintenance', 'Menjaga website tetap aman dan berfungsi', 'Laporan maintenance', 'Tiket ditutup sesuai prioritas', $yogaId],
            ]
            : [
                [1, 'Initial Consultation', 'Memahami masalah dan kelayakan kerja sama', 'Catatan konsultasi awal', 'Catatan tersimpan; keputusan lanjut/tidak tercatat', $albertId],
                [2, 'Business Analysis', 'Memahami proses bisnis dan sumber masalah', 'Ringkasan analisis bisnis', 'Ringkasan dikonfirmasi klien', $febrianaId],
                [3, 'Requirement Gathering', 'Mengumpulkan kebutuhan fungsional dan non-fungsional', 'Dokumen requirement', 'Dokumen disetujui klien tertulis', $febrianaId],
                [4, 'Process Mapping', 'Memetakan alur kerja saat ini dan alur yang diusulkan', 'Peta proses', 'Peta proses dikonfirmasi klien', $febrianaId],
                [5, 'System Design', 'Merancang struktur sistem, data, dan tampilan (UI/UX)', 'Desain sistem disetujui', 'Desain disetujui CTO dan klien', $aldoId],
                [6, 'Technical Planning', 'Menentukan pendekatan, jadwal teknis, dan estimasi', 'Rencana teknis', 'Rencana disetujui Aldo dan Farizy', $aldoId],
                [7, 'Proposal & Agreement', 'Menetapkan lingkup, harga, termin, dan aturan perubahan', 'Kesepakatan tertulis', 'Kesepakatan ditandatangani', $albertId],
                [8, 'Development', 'Membangun sistem, UI, API, dan integrasi sesuai desain', 'Sistem di staging', 'Fitur lulus acceptance criteria; kode ter-review', $yogaId],
                [9, 'Testing & QA', 'Memastikan kualitas dan keamanan dasar', 'Laporan uji', 'Tidak ada bug kritis/tinggi; QA gate lulus', $aldoId],
                [10, 'UAT', 'Klien menguji sistem pada skenario nyata', 'Hasil UAT', 'Klien menyetujui UAT', $febrianaId],
                [11, 'Deployment', 'Memindahkan sistem ke lingkungan produksi', 'Sistem live', 'Sistem berjalan; backup dan rollback tersedia', $yogaId],
                [12, 'Training & Handover', 'Membuat pengguna mampu memakai sistem', 'Dokumen handover dan panduan', 'Berita acara serah terima ditandatangani', $febrianaId],
                [13, 'Maintenance', 'Menjaga sistem stabil dan berkembang', 'Laporan maintenance', 'Tiket ditutup sesuai prioritas', $yogaId],
            ];

        foreach ($stages as [$order, $name, $purpose, $output, $criteria, $picId]) {
            ProjectStage::create([
                'project_id' => $project->id,
                'stage_order' => $order,
                'name' => $name,
                'purpose' => $purpose,
                'output_label' => $output,
                'completion_criteria' => $criteria,
                'pic_user_id' => $picId,
                'status' => $order === 1 ? 'In Progress' : 'Not Started',
            ]);
        }
    }

    public function completeStage(ProjectStage $stage, User $actor, string $evidenceNote): ProjectStage
    {
        if (trim($evidenceNote) === '') {
            throw ValidationException::withMessages([
                'completion_evidence_note' => 'Completion evidence/sign-off note is required to complete a stage.',
            ]);
        }

        $project = $stage->project;

        // 1. Sequential Gate: all prior stages must be Completed
        $incompletePrior = $project->stages()
            ->where('stage_order', '<', $stage->stage_order)
            ->where('status', '!=', 'Completed')
            ->pluck('name')
            ->all();

        if ($incompletePrior !== []) {
            $names = implode(', ', $incompletePrior);
            throw ValidationException::withMessages([
                'stage' => "Cannot complete '{$stage->name}' before prior stage(s): {$names}.",
            ]);
        }

        // 2. Domain-specific hard gates
        if ($stage->name === 'Requirement Gathering') {
            $hasApprovedReq = $project->requirements()->where('status', 'Client Approved')->exists()
                || $project->requirements()->whereIn('status', ['Implemented', 'Verified'])->exists();
            if (! $hasApprovedReq) {
                throw ValidationException::withMessages([
                    'stage' => 'Requirement Gathering requires at least one Client Approved requirement record before completion.',
                ]);
            }
        }

        if ($stage->name === 'Testing & QA') {
            $hasPassingQa = $project->qaReports()
                ->where('status', 'Passed')
                ->where('critical_bugs', 0)
                ->where('high_bugs', 0)
                ->exists();
            if (! $hasPassingQa) {
                throw ValidationException::withMessages([
                    'stage' => 'Testing & QA requires a Passed QA Report with 0 critical and 0 high bugs (Sheet 09 DoD).',
                ]);
            }
        }

        if ($stage->name === 'UAT') {
            $hasApprovedUat = $project->uatRecords()->where('status', 'Approved')->exists();
            if (! $hasApprovedUat) {
                throw ValidationException::withMessages([
                    'stage' => 'UAT stage requires a client-approved UAT record before proceeding to Deployment.',
                ]);
            }
        }

        if ($stage->name === 'Deployment') {
            $hasSafeRelease = $project->releases()
                ->where('environment', 'production')
                ->where('status', 'Live')
                ->where('has_backup', true)
                ->where('has_rollback_plan', true)
                ->exists();
            if (! $hasSafeRelease) {
                throw ValidationException::withMessages([
                    'stage' => 'Deployment stage requires a Live production release with verified Backup and Rollback Plan.',
                ]);
            }
        }

        if (in_array($stage->name, ['Handover', 'Training & Handover'], true)) {
            if (! $project->handoverRecord()->exists()) {
                throw ValidationException::withMessages([
                    'stage' => 'Handover stage requires a signed Handover Record before moving to Maintenance.',
                ]);
            }
        }

        return DB::transaction(function () use ($stage, $project, $actor, $evidenceNote): ProjectStage {
            $stage->update([
                'status' => 'Completed',
                'completion_evidence_note' => $evidenceNote,
                'completed_at' => now(),
                'approved_by' => $actor->id,
            ]);

            $nextStage = $project->stages()
                ->where('stage_order', $stage->stage_order + 1)
                ->where('status', 'Not Started')
                ->first();

            if ($nextStage) {
                $nextStage->update(['status' => 'In Progress']);
            }

            if ($stage->name === 'Deployment' || in_array($stage->name, ['Handover', 'Training & Handover'], true)) {
                $project->update([
                    'status' => in_array($stage->name, ['Handover', 'Training & Handover'], true) ? 'Maintenance' : 'Active',
                ]);
            }

            $this->audit->log(
                'project.stage_completed',
                "Completed stage '{$stage->name}' for project {$project->code}.",
                $project,
                null,
                ['stage' => $stage->name, 'evidence' => $evidenceNote],
                $actor->id
            );

            return $stage->fresh();
        });
    }
}
