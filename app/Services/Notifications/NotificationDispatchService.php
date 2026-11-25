<?php

namespace App\Services\Notifications;

use App\Domain\Workspace\Models\NotificationDeliveryLog;
use App\Domain\Workspace\Models\NotificationSetting;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class NotificationDispatchService
{
    public function configureRuntimeMailer(): NotificationSetting
    {
        $setting = NotificationSetting::current();

        if ($setting->mail_enabled && ! empty($setting->smtp_username) && ! empty($setting->smtp_password)) {
            config([
                'mail.default' => 'smtp',
                'mail.mailers.smtp.host' => $setting->smtp_host ?: 'smtp.gmail.com',
                'mail.mailers.smtp.port' => (int) ($setting->smtp_port ?: 587),
                'mail.mailers.smtp.encryption' => $setting->smtp_encryption ?: 'tls',
                'mail.mailers.smtp.username' => $setting->smtp_username,
                'mail.mailers.smtp.password' => $setting->smtp_password,
                'mail.from.address' => $setting->mail_from_address ?: $setting->smtp_username,
                'mail.from.name' => $setting->mail_from_name ?: 'Krevia Digital Management System',
            ]);

            Mail::purge('smtp');
        }

        return $setting;
    }

    public function sendWhatsApp(
        string $rawTarget,
        string $message,
        ?User $recipient = null,
        string $subject = 'KDMS Notification'
    ): string {
        $setting = NotificationSetting::current();
        $target = $this->normalizeTarget($rawTarget);

        if (! $setting->whatsapp_enabled) {
            $this->logDelivery('whatsapp', $recipient, $target, $subject, $message, 'skipped', 'WhatsApp channel is disabled.');

            return 'skipped';
        }

        $driver = $setting->whatsapp_driver ?: 'log';

        try {
            if ($driver === 'log') {
                Log::info("[KDMS WhatsApp:{$target}] {$message}");
                $this->logDelivery('whatsapp', $recipient, $target, $subject, $message, 'logged');

                return 'logged';
            }

            if ($driver === 'fonnte') {
                $url = $setting->whatsapp_api_url ?: 'https://api.fonnte.com/send';
                $resp = Http::withHeaders(['Authorization' => (string) $setting->whatsapp_api_token])
                    ->timeout(10)
                    ->post($url, [
                        'target' => $target,
                        'message' => $message,
                    ]);
                $resp->throw();
            } elseif ($driver === 'meta_cloud') {
                $phoneId = $setting->whatsapp_sender_id;
                $url = $setting->whatsapp_api_url ?: "https://graph.facebook.com/v21.0/{$phoneId}/messages";
                $resp = Http::withToken((string) $setting->whatsapp_api_token)
                    ->timeout(10)
                    ->post($url, [
                        'messaging_product' => 'whatsapp',
                        'to' => $target,
                        'type' => 'text',
                        'text' => ['body' => $message],
                    ]);
                $resp->throw();
            } elseif ($driver === 'webhook') {
                if (empty($setting->whatsapp_api_url)) {
                    throw new \RuntimeException('Webhook URL is not configured.');
                }
                $headers = [];
                if (! empty($setting->whatsapp_api_token)) {
                    $headers['Authorization'] = 'Bearer ' . $setting->whatsapp_api_token;
                }
                $resp = Http::withHeaders($headers)
                    ->timeout(10)
                    ->post($setting->whatsapp_api_url, [
                        'target' => $target,
                        'subject' => $subject,
                        'message' => $message,
                        'recipient_name' => $recipient?->name,
                        'sender' => $setting->whatsapp_sender_id,
                    ]);
                $resp->throw();
            }

            $this->logDelivery('whatsapp', $recipient, $target, $subject, $message, 'sent');

            return 'sent';
        } catch (\Throwable $e) {
            Log::warning("KDMS WhatsApp dispatch failed ({$driver}): {$e->getMessage()}");
            $this->logDelivery('whatsapp', $recipient, $target, $subject, $message, 'failed', $e->getMessage());

            return 'failed';
        }
    }

    public function sendGmailRelay(string $subject, string $body, ?User $triggeredBy = null): string
    {
        $setting = $this->configureRuntimeMailer();
        $relay = trim((string) $setting->gmail_relay_address);

        if ($relay === '') {
            return 'skipped';
        }

        try {
            Mail::raw($body, function ($msg) use ($relay, $subject) {
                $msg->to($relay)->subject("[KDMS-WA] {$subject}");
            });

            $this->logDelivery('gmail_relay', $triggeredBy, $relay, $subject, $body, 'sent');

            return 'sent';
        } catch (\Throwable $e) {
            $this->logDelivery('gmail_relay', $triggeredBy, $relay, $subject, $body, 'failed', $e->getMessage());

            return 'failed';
        }
    }

    public function logDelivery(
        string $channel,
        ?User $recipient,
        string $target,
        string $subject,
        string $preview,
        string $status,
        ?string $error = null
    ): void {
        NotificationDeliveryLog::create([
            'channel' => $channel,
            'recipient_user_id' => $recipient?->id,
            'recipient_target' => $target,
            'subject_or_type' => mb_strimwidth($subject, 0, 155, '...'),
            'payload_preview' => mb_strimwidth($preview, 0, 500, '...'),
            'status' => $status,
            'error_message' => $error,
            'sent_at' => now(),
        ]);
    }

    private function normalizeTarget(string $raw): string
    {
        $trimmed = trim($raw);
        // Preserve group IDs like 120363...@g.us
        if (str_contains($trimmed, '@')) {
            return $trimmed;
        }
        $digits = preg_replace('/\D+/', '', $trimmed) ?? '';
        if ($digits === '') {
            return $trimmed;
        }
        if (str_starts_with($digits, '0')) {
            return '62' . substr($digits, 1);
        }

        return $digits;
    }
}
