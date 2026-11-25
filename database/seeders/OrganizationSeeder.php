<?php

namespace Database\Seeders;

use App\Domain\Organization\Models\Department;
use App\Domain\Organization\Models\EmployeeProfile;
use App\Domain\Organization\Models\JobDescription;
use App\Domain\Organization\Models\Position;
use App\Domain\Organization\Models\RaciActivity;
use App\Domain\Organization\Models\RaciAssignment;
use App\Domain\Organization\Services\RaciValidatorService;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class OrganizationSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function (): void {
            $defaultPassword = Hash::make('Krevia@2026!');

            $membersData = [
                [
                    'key' => 'albert',
                    'code' => 'KRV-01',
                    'name' => 'Albert Christian',
                    'email' => 'albert@kreviadigital.com',
                    'role' => User::ROLE_FOUNDER,
                    'dept_code' => 'BIZ',
                    'dept_name' => 'Bisnis & Komersial',
                    'dept_color' => '#2563EB',
                    'pos_code' => 'MD',
                    'pos_title' => 'Founder & Managing Director / Commercial Lead',
                    'level' => 'Leadership',
                    'authority_summary' => 'Final commercial, pricing, partnership, and business direction authority (D-01, D-08).',
                    'coordination_note' => 'Pimpinan perusahaan; keputusan akhir bisnis dan komersial',
                    'coordination_status' => 'Sesuai arahan',
                    'focus_summary' => 'Arah bisnis, klien, harga, proposal, kerja sama',
                    'avatar_color' => '#101D35',
                ],
                [
                    'key' => 'farizy',
                    'code' => 'KRV-02',
                    'name' => 'Farizy Rahman Hidayat',
                    'email' => 'farizy@kreviadigital.com',
                    'role' => User::ROLE_OPERATIONS,
                    'dept_code' => 'OPS',
                    'dept_name' => 'Operasional & Koordinasi',
                    'dept_color' => '#D97706',
                    'pos_code' => 'COO',
                    'pos_title' => 'Co-Founder & Director of Operations',
                    'level' => 'Leadership',
                    'authority_summary' => 'Operational coordination, work tracking, meetings, QA process gates, and co-finance management (D-05).',
                    'coordination_note' => 'Setara dengan Albert dan Aldo; berkoordinasi dengan seluruh anggota',
                    'coordination_status' => 'Sesuai arahan',
                    'focus_summary' => 'Pembagian kerja, timeline, tracking, rapat, dokumentasi',
                    'avatar_color' => '#1E3A5F',
                ],
                [
                    'key' => 'aldo',
                    'code' => 'KRV-03',
                    'name' => 'Aldo E. Sianturi',
                    'email' => 'aldo@kreviadigital.com',
                    'role' => User::ROLE_CTO,
                    'dept_code' => 'TECH',
                    'dept_name' => 'Teknologi & Engineering',
                    'dept_color' => '#0D9488',
                    'pos_code' => 'CTO',
                    'pos_title' => 'CTO / Technology Lead',
                    'level' => 'Leadership',
                    'authority_summary' => 'Final technical architecture, engineering standards, technical estimates, code review, and release sign-off.',
                    'coordination_note' => 'Setara dengan Albert dan Farizy; atasan teknis Yoga, Ananta, dan Febriana (aspek analisis)',
                    'coordination_status' => 'Sesuai arahan',
                    'focus_summary' => 'Arsitektur, standar teknis, review, kualitas dan keamanan',
                    'avatar_color' => '#0F766E',
                ],
                [
                    'key' => 'febriana',
                    'code' => 'KRV-04',
                    'name' => 'Febriana',
                    'email' => 'febriana@kreviadigital.com',
                    'role' => User::ROLE_SYSTEM_ANALYST,
                    'dept_code' => 'ANA',
                    'dept_name' => 'Analisis & Relasi Klien',
                    'dept_color' => '#7C3AED',
                    'pos_code' => 'SA',
                    'pos_title' => 'System Analyst & Client Relations Specialist',
                    'level' => 'Specialist',
                    'authority_summary' => 'Requirements documentation, user flows, acceptance criteria, client UAT, and user handover.',
                    'coordination_note' => 'Aldo (analisis dan teknis); Albert (komunikasi klien dan komersial)',
                    'coordination_status' => 'Usulan (D-06)',
                    'focus_summary' => 'Kebutuhan klien, analisis sistem, dokumentasi, UAT',
                    'avatar_color' => '#5B21B6',
                    'primary' => 'aldo',
                    'secondary' => 'albert',
                ],
                [
                    'key' => 'yoga',
                    'code' => 'KRV-05',
                    'name' => 'MHD Yoga Andhika',
                    'email' => 'yoga@kreviadigital.com',
                    'role' => User::ROLE_BACKEND_ENGINEER,
                    'dept_code' => 'TECH',
                    'dept_name' => 'Teknologi & Engineering',
                    'dept_color' => '#0D9488',
                    'pos_code' => 'BE',
                    'pos_title' => 'Core Systems & Backend Engineer',
                    'level' => 'Engineer',
                    'authority_summary' => 'Backend, database, APIs, integrations, and deployment execution within CTO standards.',
                    'coordination_note' => 'Aldo',
                    'coordination_status' => 'Sesuai arahan',
                    'focus_summary' => 'Backend, database, API, integrasi, deployment',
                    'avatar_color' => '#0369A1',
                    'primary' => 'aldo',
                ],
                [
                    'key' => 'ananta',
                    'code' => 'KRV-06',
                    'name' => 'Ananta Firdaus',
                    'email' => 'ananta@kreviadigital.com',
                    'role' => User::ROLE_TECH_CONTRIBUTOR,
                    'dept_code' => 'TECH',
                    'dept_name' => 'Teknologi & Engineering',
                    'dept_color' => '#0D9488',
                    'pos_code' => 'TC',
                    'pos_title' => 'Dedicated Technical Contributor',
                    'level' => 'Contributor',
                    'authority_summary' => 'Assigned technical feature implementation, debugging, and basic testing under CTO supervision.',
                    'coordination_note' => 'Aldo; keputusan arsitektur utama wajib persetujuan CTO',
                    'coordination_status' => 'Sesuai arahan',
                    'focus_summary' => 'Implementasi fitur, debugging, pengujian dasar',
                    'avatar_color' => '#334155',
                    'primary' => 'aldo',
                ],
                [
                    'key' => 'jihanz',
                    'code' => 'KRV-07',
                    'name' => 'Jihanz Fairuz Tsani',
                    'email' => 'jihanz@kreviadigital.com',
                    'role' => User::ROLE_SOCIAL_DESIGN,
                    'dept_code' => 'BRD',
                    'dept_name' => 'Brand, Konten & Desain',
                    'dept_color' => '#DB2777',
                    'pos_code' => 'SMGD',
                    'pos_title' => 'Social Media & Graphic Design',
                    'level' => 'Specialist',
                    'authority_summary' => 'Visual brand identity, social content production, and promotional assets; no unreviewed claims or software dev.',
                    'coordination_note' => 'Albert (brand dan konten); Farizy (jadwal dan koordinasi)',
                    'coordination_status' => 'Usulan (D-06)',
                    'focus_summary' => 'Identitas visual, konten media sosial, aset promosi',
                    'avatar_color' => '#9D174D',
                    'primary' => 'albert',
                    'secondary' => 'farizy',
                ],
            ];

            $users = [];
            $departments = [];
            $positions = [];

            foreach ($membersData as $index => $m) {
                $user = User::updateOrCreate(
                    ['email' => $m['email']],
                    [
                        'name' => $m['name'],
                        'password' => $defaultPassword,
                        'email_verified_at' => now(),
                        'is_active' => true,
                    ]
                );
                $user->syncRoles([$m['role']]);
                $users[$m['key']] = $user;

                $dept = Department::firstOrCreate(
                    ['code' => $m['dept_code']],
                    [
                        'name' => $m['dept_name'],
                        'color_hex' => $m['dept_color'],
                        'sort_order' => $index + 1,
                    ]
                );
                $departments[$m['dept_code']] = $dept;

                $position = Position::updateOrCreate(
                    ['code' => $m['pos_code']],
                    [
                        'title' => $m['pos_title'],
                        'department_id' => $dept->id,
                        'level' => $m['level'],
                        'authority_summary' => $m['authority_summary'],
                    ]
                );
                $positions[$m['key']] = $position;
            }

            // Set department leads
            $departments['BIZ']->update(['lead_user_id' => $users['albert']->id]);
            $departments['OPS']->update(['lead_user_id' => $users['farizy']->id]);
            $departments['TECH']->update(['lead_user_id' => $users['aldo']->id]);
            $departments['ANA']->update(['lead_user_id' => $users['aldo']->id]);
            $departments['BRD']->update(['lead_user_id' => $users['albert']->id]);

            foreach ($membersData as $m) {
                EmployeeProfile::updateOrCreate(
                    ['user_id' => $users[$m['key']]->id],
                    [
                        'employee_code' => $m['code'],
                        'department_id' => $departments[$m['dept_code']]->id,
                        'position_id' => $positions[$m['key']]->id,
                        'primary_supervisor_id' => isset($m['primary']) ? $users[$m['primary']]->id : null,
                        'secondary_supervisor_id' => isset($m['secondary']) ? $users[$m['secondary']]->id : null,
                        'coordination_note' => $m['coordination_note'],
                        'coordination_status' => $m['coordination_status'],
                        'focus_summary' => $m['focus_summary'],
                        'weekly_capacity_hours' => null, // D-07 Perlu Konfirmasi Manajemen
                        'capacity_status' => 'Perlu Konfirmasi Manajemen',
                        'employment_status' => 'Active',
                        'joined_at' => '2026-12-01',
                        'avatar_color' => $m['avatar_color'],
                    ]
                );
            }

            // Seed Sheet 03 Job Descriptions
            $jobDescs = [
                'albert' => [
                    'purpose' => 'Menentukan arah bisnis dan membawa Krevia memperoleh klien yang sesuai dengan dua lini layanan.',
                    'responsibilities' => [
                        'Menentukan arah bisnis, positioning, dan target pasar',
                        'Memimpin pencarian klien dan business development',
                        'Memimpin negosiasi, penawaran, dan keputusan komersial',
                        'Menyetujui harga, proposal, dan kerja sama',
                        'Mengembangkan partnership dan peluang bisnis',
                        'Mengawasi perkembangan perusahaan secara keseluruhan',
                    ],
                    'routine_tasks' => [
                        'Memperbarui sheet 08 Sales Pipeline setiap hari kerja',
                        'Follow-up prospek sesuai tanggal di pipeline',
                        'Review funnel pada weekly sync',
                        'Menyetujui konten bernada komersial dari Jihanz',
                    ],
                    'project_tasks' => [
                        'Discovery meeting dan negosiasi',
                        'Persetujuan lingkup dan harga proposal',
                        'Menjaga hubungan klien sepanjang proyek dan maintenance',
                    ],
                    'expected_outputs' => [
                        'Prospek terverifikasi dan tercatat',
                        'Proposal terkirim sesuai jadwal',
                        'Keputusan komersial tertulis di Decision Log',
                        'Laporan Managing Director bulanan',
                    ],
                    'success_indicators' => [
                        'Jumlah prospek berkualitas, meeting, dan proposal sesuai target yang disepakati',
                        'Follow-up dilakukan tepat waktu',
                        'Proyek yang berhasil diperoleh',
                    ],
                    'authority_limits' => [
                        'Memutuskan harga, kerja sama, dan arah bisnis',
                        'Tidak mengubah keputusan arsitektur teknis tanpa konsultasi Aldo',
                        'Tidak menambah lini bisnis baru tanpa dasar dan persetujuan tercatat',
                    ],
                    'coordination_links' => [
                        'Farizy: jadwal dan beban kerja',
                        'Aldo: estimasi dan kelayakan teknis',
                        'Febriana: kebutuhan klien',
                        'Jihanz: konten dan klaim pemasaran',
                    ],
                ],
                'farizy' => [
                    'purpose' => 'Memastikan strategi yang disepakati berubah menjadi pekerjaan yang benar-benar terlaksana tepat waktu.',
                    'responsibilities' => [
                        'Mengelola operasional internal dan sistem koordinasi',
                        'Memastikan setiap anggota memahami tugasnya',
                        'Mengatur pembagian pekerjaan dan timeline',
                        'Memantau progres, deadline, dan tindak lanjut',
                        'Mengelola dokumentasi dan rapat internal',
                        'Mengidentifikasi hambatan operasional',
                        'Mengawasi disiplin proses dan koordinasi tim',
                    ],
                    'routine_tasks' => [
                        'Memimpin weekly team sync (Senin)',
                        'Menerbitkan rekap Weekly Progress Report (Jumat)',
                        'Memeriksa Task Tracker: PIC, deadline, bukti',
                        'Menjalankan QA gate proses sesuai Definition of Done',
                    ],
                    'project_tasks' => [
                        'Menjalankan Project Kickoff dan Project Retrospective',
                        'Menyusun rencana proyek bersama Aldo',
                        'Mengelola pencatatan keuangan bersama Albert',
                    ],
                    'expected_outputs' => [
                        'Task Tracker rapi dan terbaru',
                        'Notulen rapat ≤24 jam dengan action items ber-PIC',
                        'Laporan operasional mingguan dan bulanan',
                    ],
                    'success_indicators' => [
                        'Ketepatan tracking dan kelengkapan bukti',
                        'Blocker diselesaikan atau dieskalasi tepat waktu',
                        'Rapat menghasilkan tindak lanjut yang selesai',
                    ],
                    'authority_limits' => [
                        'Mengatur jadwal dan beban kerja operasional',
                        'Tidak memutuskan arsitektur teknis maupun harga',
                        'Eskalasi hambatan ke Albert atau Aldo sesuai jenisnya',
                    ],
                    'coordination_links' => [
                        'Albert: prioritas bisnis',
                        'Aldo: kapasitas dan jadwal teknis',
                        'Seluruh anggota: update progres',
                    ],
                ],
                'aldo' => [
                    'purpose' => 'Memimpin arah teknologi dan menjamin kualitas teknis seluruh solusi yang dikembangkan Krevia.',
                    'responsibilities' => [
                        'Menentukan arsitektur dan pendekatan teknis',
                        'Menetapkan standar pengembangan perangkat lunak',
                        'Technical planning dan estimasi',
                        'Membagi dan mengawasi pekerjaan teknis',
                        'Code review dan technical review',
                        'Menjaga kualitas dan keamanan dasar sistem',
                        'Memastikan solusi sesuai kebutuhan klien',
                        'Mengawasi kesiapan deployment dan delivery',
                    ],
                    'routine_tasks' => [
                        'Review kode dan pekerjaan teknis (maksimal 2 hari kerja)',
                        'Memeriksa estimasi untuk proposal',
                        'Memberi arahan teknis kepada Yoga dan Ananta',
                    ],
                    'project_tasks' => [
                        'Arsitektur dan desain sistem per proyek',
                        'Persetujuan deployment dari sisi teknis',
                        'Memastikan solusi sesuai kebutuhan klien bersama Febriana',
                    ],
                    'expected_outputs' => [
                        'Standar teknis tertulis',
                        'Estimasi teknis untuk quotation',
                        'Review teknis terdokumentasi',
                        'Rilis yang siap dan stabil',
                    ],
                    'success_indicators' => [
                        'Bug kritis pada rilis',
                        'Ketepatan estimasi',
                        'Rilis dan demo sesuai jadwal',
                    ],
                    'authority_limits' => [
                        'Memutuskan arsitektur dan standar teknis (final)',
                        'Memberi persetujuan rilis dari sisi teknis',
                        'Tidak menyetujui harga atau lingkup komersial tanpa Albert',
                    ],
                    'coordination_links' => [
                        'Albert: estimasi dan lingkup',
                        'Febriana: requirement',
                        'Farizy: jadwal dan gate',
                        'Yoga dan Ananta: pelaksanaan',
                    ],
                ],
                'febriana' => [
                    'purpose' => 'Menerjemahkan kebutuhan calon klien dan klien menjadi dokumen yang jelas dan dapat dibangun.',
                    'responsibilities' => [
                        'Menggali kebutuhan melalui wawancara dan requirement gathering',
                        'Menganalisis masalah dan alur kerja organisasi klien',
                        'Menyusun dokumentasi kebutuhan sistem',
                        'Membuat user flow, use case, dan acceptance criteria',
                        'Menjaga komunikasi dan tindak lanjut kebutuhan klien',
                        'Membantu proposal dari sisi kebutuhan',
                        'Mendampingi UAT dan dokumentasi klien',
                    ],
                    'routine_tasks' => [
                        'Menindaklanjuti pesan klien ≤2 hari kerja',
                        'Memperbarui dokumen kebutuhan setelah perubahan disetujui',
                        'Menyiapkan catatan discovery ≤24 jam',
                    ],
                    'project_tasks' => [
                        'Pendampingan UAT dan dokumentasi klien',
                        'Handover dan pelatihan singkat pengguna',
                    ],
                    'expected_outputs' => [
                        'Dokumen requirement terkonfirmasi klien',
                        'User flow dan acceptance criteria',
                        'Catatan meeting dan tindak lanjut',
                    ],
                    'success_indicators' => [
                        'Kelengkapan requirement sebelum development',
                        'Ketepatan dokumentasi',
                        'Tindak lanjut klien tepat waktu',
                    ],
                    'authority_limits' => [
                        'Menetapkan isi dokumen kebutuhan',
                        'Tidak menjanjikan fitur, harga, atau jadwal ke klien tanpa persetujuan Albert dan Aldo',
                    ],
                    'coordination_links' => [
                        'Albert: klien dan komersial',
                        'Aldo: kelayakan teknis',
                        'Yoga dan Ananta: klarifikasi implementasi',
                    ],
                ],
                'yoga' => [
                    'purpose' => 'Membangun dan menjaga backend yang stabil, aman, dan terdokumentasi untuk seluruh sistem Krevia.',
                    'responsibilities' => [
                        'Mengembangkan backend aplikasi',
                        'Mengelola database dan API',
                        'Mengembangkan integrasi sistem',
                        'Menerapkan validasi dan kontrol akses',
                        'Mendukung deployment dan konfigurasi server',
                        'Menangani perbaikan bug backend',
                        'Membuat dokumentasi teknis',
                        'Menjaga stabilitas dan pemeliharaan sistem',
                    ],
                    'routine_tasks' => [
                        'Update progres task di Task Tracker',
                        'Memperbarui dokumentasi API dan runbook',
                        'Memeriksa backup dan log sistem berjalan',
                    ],
                    'project_tasks' => [
                        'Rancang skema dan API per proyek',
                        'Deployment dan rollback plan',
                        'Perbaikan bug dan maintenance pasca-rilis',
                    ],
                    'expected_outputs' => [
                        'API dan database berjalan sesuai spesifikasi',
                        'Dokumentasi teknis dan runbook',
                        'Deployment tanpa insiden',
                    ],
                    'success_indicators' => [
                        'Task backend selesai tepat waktu',
                        'Kualitas integrasi (uji lulus)',
                        'Kelengkapan dokumentasi',
                    ],
                    'authority_limits' => [
                        'Keputusan implementasi backend dalam standar CTO',
                        'Perubahan arsitektur besar wajib persetujuan Aldo',
                    ],
                    'coordination_links' => [
                        'Aldo: arsitektur dan review',
                        'Ananta: pembagian modul',
                        'Febriana: acceptance criteria',
                    ],
                ],
                'ananta' => [
                    'purpose' => 'Membantu implementasi fitur dan perbaikan bug secara rapi sesuai arahan CTO.',
                    'responsibilities' => [
                        'Membantu implementasi fitur',
                        'Menyelesaikan task teknis yang ditugaskan',
                        'Membantu frontend atau backend sesuai kebutuhan proyek dan kemampuan',
                        'Debugging dan perbaikan bug',
                        'Pengujian dasar',
                        'Menyusun dokumentasi pekerjaan',
                    ],
                    'routine_tasks' => [
                        'Update status task harian',
                        'Pengujian dasar sebelum meminta review',
                        'Mencatat kendala ≤1 hari kerja setelah muncul',
                    ],
                    'project_tasks' => [
                        'Implementasi antarmuka dan modul pendukung',
                        'Perbaikan bug pada demo dan proyek berjalan',
                    ],
                    'expected_outputs' => [
                        'Fitur selesai sesuai acceptance criteria',
                        'Bug ditutup dengan bukti',
                        'Catatan dokumentasi singkat',
                    ],
                    'success_indicators' => [
                        'Task selesai sesuai deadline',
                        'Kualitas implementasi (lulus review tanpa revisi besar)',
                    ],
                    'authority_limits' => [
                        'Tidak memutuskan arsitektur utama tanpa persetujuan CTO',
                        'Task di luar penugasan perlu persetujuan Aldo',
                    ],
                    'coordination_links' => [
                        'Aldo: arahan dan review',
                        'Yoga: integrasi backend',
                        'Febriana: kejelasan requirement',
                    ],
                ],
                'jihanz' => [
                    'purpose' => 'Menjaga identitas visual Krevia dan menghasilkan konten yang konsisten untuk membangun kepercayaan pasar.',
                    'responsibilities' => [
                        'Menjaga identitas visual Krevia',
                        'Membuat desain konten: feed, Reels, Story',
                        'Menyusun aset visual dan materi promosi',
                        'Membantu penyusunan kalender konten',
                        'Menyiapkan materi visual portfolio dan presentasi',
                        'Menjadwalkan publikasi',
                        'Mengevaluasi performa konten',
                    ],
                    'routine_tasks' => [
                        'Produksi batch mingguan sesuai sheet 11',
                        'Mengirim konten untuk review H-2',
                        'Mempublikasikan sesuai jadwal',
                        'Laporan performa bulanan',
                    ],
                    'project_tasks' => [
                        'Aset visual portofolio demo',
                        'Company profile dan template presentasi',
                    ],
                    'expected_outputs' => [
                        'Konten terbit sesuai jadwal',
                        'Aset visual rapi di folder desain',
                        'Laporan performa konten',
                    ],
                    'success_indicators' => [
                        'Konsistensi publikasi',
                        'Kualitas aset (lulus review tanpa revisi besar)',
                        'Evaluasi performa tepat waktu',
                    ],
                    'authority_limits' => [
                        'Memutuskan desain visual dalam panduan brand',
                        'Tidak mempublikasikan klaim komersial atau teknis tanpa review reviewer',
                        'Tidak mengerjakan pengembangan software',
                    ],
                    'coordination_links' => [
                        'Albert: klaim dan arah brand',
                        'Febriana: substansi',
                        'Aldo: akurasi teknis',
                        'Farizy: jadwal',
                    ],
                ],
            ];

            foreach ($jobDescs as $key => $jd) {
                JobDescription::updateOrCreate(
                    ['position_id' => $positions[$key]->id],
                    $jd
                );
            }

            // Seed Sheet 04 RACI Matrix (17 activities)
            $raciData = [
                ['Business strategy', 'Keputusan arah bisnis ada pada Albert', 'Disepakati', ['albert' => 'A/R', 'farizy' => 'C', 'aldo' => 'C', 'febriana' => 'I', 'yoga' => 'I', 'ananta' => 'I', 'jihanz' => 'I']],
                ['Prospecting', 'Jihanz mendukung materi outreach', 'Disepakati', ['albert' => 'A/R', 'farizy' => 'I', 'aldo' => 'I', 'febriana' => 'C', 'jihanz' => 'C']],
                ['Client communication', 'Albert: komersial; Febriana: kebutuhan dan tindak lanjut', 'Disepakati', ['albert' => 'A', 'farizy' => 'I', 'aldo' => 'C', 'febriana' => 'R']],
                ['Requirement gathering', '', 'Disepakati', ['albert' => 'C', 'farizy' => 'I', 'aldo' => 'C', 'febriana' => 'A/R', 'yoga' => 'I', 'ananta' => 'I']],
                ['System analysis', 'Aldo menyetujui hasil analisis dari sisi teknis', 'Disepakati', ['albert' => 'I', 'farizy' => 'I', 'aldo' => 'A', 'febriana' => 'R', 'yoga' => 'C', 'ananta' => 'I']],
                ['Proposal dan quotation', 'Estimasi dari Aldo; kebutuhan dari Febriana', 'Disepakati', ['albert' => 'A/R', 'farizy' => 'I', 'aldo' => 'C', 'febriana' => 'C']],
                ['Project planning', 'Farizy: timeline; Aldo: rencana teknis', 'Disepakati', ['albert' => 'C', 'farizy' => 'A/R', 'aldo' => 'R', 'febriana' => 'C', 'yoga' => 'C', 'ananta' => 'I']],
                ['UI/UX', 'UI/UX klien tidak masuk jobdesk Jihanz; Jihanz konsultatif untuk konsistensi visual (D-10)', 'Perlu Konfirmasi Manajemen', ['albert' => 'I', 'farizy' => 'I', 'aldo' => 'A/R', 'febriana' => 'C', 'ananta' => 'R', 'jihanz' => 'C']],
                ['Development', '', 'Disepakati', ['albert' => 'I', 'farizy' => 'I', 'aldo' => 'A', 'febriana' => 'C', 'yoga' => 'R', 'ananta' => 'R']],
                ['Backend', '', 'Disepakati', ['farizy' => 'I', 'aldo' => 'A', 'febriana' => 'C', 'yoga' => 'R', 'ananta' => 'C']],
                ['Testing', 'Pengujian dasar oleh Ananta; integrasi oleh Yoga', 'Disepakati', ['farizy' => 'I', 'aldo' => 'A', 'febriana' => 'C', 'yoga' => 'R', 'ananta' => 'R']],
                ['Deployment', '', 'Disepakati', ['albert' => 'I', 'farizy' => 'I', 'aldo' => 'A', 'yoga' => 'R', 'ananta' => 'C']],
                ['Quality assurance', 'Farizy: gate proses dan DoD; Aldo: kualitas teknis', 'Disepakati', ['albert' => 'I', 'farizy' => 'R', 'aldo' => 'A', 'febriana' => 'C', 'yoga' => 'C', 'ananta' => 'C']],
                ['Social media', 'Reviewer sesuai kategori (sheet 11)', 'Disepakati', ['albert' => 'A', 'farizy' => 'I', 'aldo' => 'C', 'febriana' => 'C', 'jihanz' => 'R']],
                ['Financial administration', 'Hanya Albert dan Farizy yang mengedit sheet 13', 'Disepakati', ['albert' => 'A', 'farizy' => 'R']],
                ['Project handover', '', 'Disepakati', ['albert' => 'C', 'farizy' => 'I', 'aldo' => 'A', 'febriana' => 'R', 'yoga' => 'C', 'ananta' => 'C']],
                ['Maintenance', 'Permintaan komersial lewat Albert', 'Disepakati', ['albert' => 'I', 'farizy' => 'I', 'aldo' => 'A', 'febriana' => 'C', 'yoga' => 'R', 'ananta' => 'R']],
            ];

            $validator = app(RaciValidatorService::class);

            foreach ($raciData as $index => [$activityName, $notes, $dataStatus, $map]) {
                $validator->validateOrFail($map);

                $activity = RaciActivity::updateOrCreate(
                    ['activity_name' => $activityName],
                    [
                        'sort_order' => $index + 1,
                        'notes' => $notes !== '' ? $notes : null,
                        'data_status' => $dataStatus,
                    ]
                );

                foreach ($map as $memberKey => $code) {
                    RaciAssignment::updateOrCreate(
                        [
                            'raci_activity_id' => $activity->id,
                            'user_id' => $users[$memberKey]->id,
                        ],
                        ['raci_code' => $code]
                    );
                }
            }
        });
    }
}
