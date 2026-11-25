<?php

namespace App\Domain\Marketing\Models;

use App\Domain\Portfolio\Models\DemoProduct;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class ContentItem extends Model
{
    use SoftDeletes;

    public const PLATFORMS = [
        'Instagram Feed',
        'Instagram Reels',
        'Instagram Story',
        'LinkedIn',
        'TikTok',
    ];

    public const CATEGORIES = [
        'Company Introduction',
        'Service Education',
        'Business Problems',
        'Website & Software Tips',
        'Portfolio Showcase',
        'Demo Product',
        'Behind the Scenes',
        'Case Study',
        'Company Updates',
    ];

    public const DEMO_GATED_CATEGORIES = [
        'Portfolio Showcase',
        'Demo Product',
        'Case Study',
    ];

    public const STATUSES = [
        'Planned',
        'In Production',
        'In Review',
        'Revision Needed',
        'Approved',
        'Scheduled',
        'Published',
        'Cancelled',
    ];

    public const CATEGORY_REVIEWER_EMAILS = [
        'Company Introduction' => 'albert@kreviadigital.com',
        'Service Education' => 'febriana@kreviadigital.com',
        'Business Problems' => 'febriana@kreviadigital.com',
        'Website & Software Tips' => 'aldo@kreviadigital.com',
        'Portfolio Showcase' => 'albert@kreviadigital.com',
        'Demo Product' => 'aldo@kreviadigital.com',
        'Behind the Scenes' => 'farizy@kreviadigital.com',
        'Case Study' => 'albert@kreviadigital.com',
        'Company Updates' => 'albert@kreviadigital.com',
    ];

    public const FREQUENCY_GUIDELINES = [
        [
            'platform' => 'Instagram Feed',
            'frequency' => '1 kali per minggu',
            'suggested_day' => 'Selasa (Usulan)',
            'rule' => 'Carousel atau infografis; satu pesan utama per postingan',
        ],
        [
            'platform' => 'Instagram Reels',
            'frequency' => '1 kali per minggu',
            'suggested_day' => 'Jumat (Usulan)',
            'rule' => 'Video 30–45 detik; satu ide per video (Kamis bila Jumat libur)',
        ],
        [
            'platform' => 'Instagram Story',
            'frequency' => 'Sesuai kebutuhan',
            'suggested_day' => 'Fleksibel',
            'rule' => 'Pengingat tayang, kutipan Reels, jajak pendapat; dibuat sesuai kebutuhan',
        ],
        [
            'platform' => 'LinkedIn',
            'frequency' => '1–2 kali per bulan',
            'suggested_day' => 'Selasa–Jumat',
            'rule' => 'Artikel atau postingan lebih panjang; bahasa profesional',
        ],
        [
            'platform' => 'TikTok',
            'frequency' => 'Memakai ulang Reels relevan',
            'suggested_day' => 'H+1 setelah Reels',
            'rule' => 'Dipakai ulang untuk Reels relevan; tidak membuat konten baru terpisah',
        ],
    ];

    protected $fillable = [
        'code',
        'demo_product_id',
        'platform',
        'category',
        'title_topic',
        'brief',
        'caption',
        'hashtags',
        'pic_user_id',
        'reviewer_user_id',
        'production_date',
        'review_date',
        'publish_date',
        'published_at',
        'published_url',
        'status',
        'is_reused_reel',
        'source_content_id',
        'is_approved',
        'approved_by',
        'approved_at',
        'data_status',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'production_date' => 'date',
            'review_date' => 'date',
            'publish_date' => 'date',
            'published_at' => 'datetime',
            'is_reused_reel' => 'boolean',
            'is_approved' => 'boolean',
            'approved_at' => 'datetime',
        ];
    }

    public function demoProduct(): BelongsTo
    {
        return $this->belongsTo(DemoProduct::class);
    }

    public function pic(): BelongsTo
    {
        return $this->belongsTo(User::class, 'pic_user_id');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewer_user_id');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function sourceContent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'source_content_id');
    }

    public function assets(): HasMany
    {
        return $this->hasMany(ContentAsset::class)->latest('id');
    }

    public function approvals(): HasMany
    {
        return $this->hasMany(ContentApproval::class)->latest('reviewed_at');
    }

    public function metrics(): HasMany
    {
        return $this->hasMany(ContentMetric::class)->latest('recorded_date');
    }
}
