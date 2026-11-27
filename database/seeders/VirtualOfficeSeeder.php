<?php

namespace Database\Seeders;

use App\Domain\VirtualOffice\Models\OfficeSeat;
use App\Domain\VirtualOffice\Models\OfficeZone;
use Illuminate\Database\Seeder;

class VirtualOfficeSeeder extends Seeder
{
    public function run(): void
    {
        $zones = [
            [
                'code' => 'ZONE-01',
                'slug' => 'reception',
                'name' => 'Reception & Lobby',
                'type' => 'reception',
                'description' => 'Digital headquarters front desk, visitor welcome lounge, and company-wide announcement board.',
                'capacity' => 6,
                'color' => '#0D9488',
                'layout_config' => ['x' => -7.2, 'z' => 4.5, 'w' => 6.8, 'd' => 5.2],
            ],
            [
                'code' => 'ZONE-02',
                'slug' => 'workspace',
                'name' => 'Main Workspace',
                'type' => 'workspace',
                'description' => 'Core engineering and operations floor with dual-monitor workstations for sprint execution.',
                'capacity' => 10,
                'color' => '#2563EB',
                'layout_config' => ['x' => -3.5, 'z' => -3.6, 'w' => 13.6, 'd' => 7.4],
            ],
            [
                'code' => 'ZONE-03',
                'slug' => 'meeting',
                'name' => 'Meeting Room',
                'type' => 'meeting',
                'description' => 'Glass-walled executive conference suite for weekly syncs, client discovery, and governance reviews.',
                'capacity' => 10,
                'color' => '#7C3AED',
                'layout_config' => ['x' => 7.2, 'z' => -3.6, 'w' => 7.2, 'd' => 7.4],
            ],
            [
                'code' => 'ZONE-04',
                'slug' => 'lounge',
                'name' => 'Lounge Area',
                'type' => 'lounge',
                'description' => 'Casual collaboration lounge for informal check-ins, coffee breaks, and team directory browsing.',
                'capacity' => 6,
                'color' => '#16A34A',
                'layout_config' => ['x' => 0.4, 'z' => 4.5, 'w' => 6.8, 'd' => 5.2],
            ],
            [
                'code' => 'ZONE-05',
                'slug' => 'project',
                'name' => 'Project Room',
                'type' => 'project',
                'description' => 'Dedicated delivery war-room for Website & Custom Software milestones, architecture, and QA.',
                'capacity' => 6,
                'color' => '#D97706',
                'layout_config' => ['x' => 7.5, 'z' => 4.5, 'w' => 6.4, 'd' => 5.2],
            ],
        ];

        foreach ($zones as $z) {
            $zone = OfficeZone::updateOrCreate(['slug' => $z['slug']], $z);

            if ($zone->slug === 'workspace') {
                $desks = [
                    ['desk-1', -7.6, -4.5, 0],
                    ['desk-2', -4.6, -4.5, 0],
                    ['desk-3', -1.6, -4.5, 0],
                    ['desk-4', -7.6, -2.5, 3.142],
                    ['desk-5', -4.6, -2.5, 3.142],
                    ['desk-6', -1.6, -2.5, 3.142],
                ];
                foreach ($desks as [$key, $x, $zPos, $rot]) {
                    OfficeSeat::updateOrCreate(
                        ['zone_id' => $zone->id, 'seat_key' => $key],
                        ['pos_x' => $x, 'pos_y' => 0, 'pos_z' => $zPos, 'rotation' => $rot, 'type' => 'desk', 'is_hot_desk' => true]
                    );
                }
            }
        }
    }
}
