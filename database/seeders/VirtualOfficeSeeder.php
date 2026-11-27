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
                'seats' => [
                    ['rec-desk', -7.2, 3.2, 0, 'desk'],
                    ['rec-sofa-1', -7.8, 5.95, 3.142, 'sofa'],
                    ['rec-sofa-2', -6.6, 5.95, 3.142, 'sofa'],
                ],
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
                'seats' => [
                    ['desk-1', -7.6, -4.56, 0, 'desk'],
                    ['desk-2', -4.6, -4.56, 0, 'desk'],
                    ['desk-3', -1.6, -4.56, 0, 'desk'],
                    ['desk-4', -7.6, -2.44, 3.142, 'desk'],
                    ['desk-5', -4.6, -2.44, 3.142, 'desk'],
                    ['desk-6', -1.6, -2.44, 3.142, 'desk'],
                ],
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
                'seats' => [
                    ['meet-1', 5.8, -4.85, 0, 'meeting'],
                    ['meet-2', 6.75, -4.85, 0, 'meeting'],
                    ['meet-3', 7.65, -4.85, 0, 'meeting'],
                    ['meet-4', 8.6, -4.85, 0, 'meeting'],
                    ['meet-5', 5.8, -2.35, 3.142, 'meeting'],
                    ['meet-6', 6.75, -2.35, 3.142, 'meeting'],
                    ['meet-7', 7.65, -2.35, 3.142, 'meeting'],
                    ['meet-8', 8.6, -2.35, 3.142, 'meeting'],
                ],
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
                'seats' => [
                    ['lounge-sofa-1', -0.2, 3.3, 0, 'sofa'],
                    ['lounge-sofa-2', 1.0, 3.3, 0, 'sofa'],
                    ['lounge-side', -0.8, 4.75, 1.571, 'sofa'],
                    ['lounge-bean', 2.4, 5.8, -0.785, 'sofa'],
                ],
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
                'seats' => [
                    ['proj-1', 6.65, 3.65, 0, 'meeting'],
                    ['proj-2', 8.35, 3.65, 0, 'meeting'],
                    ['proj-3', 6.65, 5.75, 3.142, 'meeting'],
                    ['proj-4', 8.35, 5.75, 3.142, 'meeting'],
                ],
            ],
        ];

        foreach ($zones as $z) {
            $seats = $z['seats'];
            unset($z['seats']);

            $zone = OfficeZone::updateOrCreate(['slug' => $z['slug']], $z);

            foreach ($seats as [$key, $x, $zPos, $rot, $type]) {
                OfficeSeat::updateOrCreate(
                    ['zone_id' => $zone->id, 'seat_key' => $key],
                    [
                        'pos_x' => $x,
                        'pos_y' => 0,
                        'pos_z' => $zPos,
                        'rotation' => $rot,
                        'type' => $type,
                        'is_hot_desk' => true,
                    ]
                );
            }
        }
    }
}
