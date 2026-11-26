<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $emailTitle ?? 'Krevia Digital DMS' }}</title>
</head>
<body style="margin:0;padding:0;background-color:#F4F6FA;font-family:Arial,Helvetica,sans-serif;color:#1E293B;-webkit-font-smoothing:antialiased;">
@if(!empty($preheader))
    <div style="display:none;font-size:1px;color:#F4F6FA;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
        {{ $preheader }}
    </div>
@endif

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F4F6FA;padding:24px 12px;">
    <tr>
        <td align="center">
            <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background-color:#FFFFFF;border:1px solid #E2E8F0;border-radius:10px;overflow:hidden;">
                <!-- Header -->
                <tr>
                    <td style="background-color:#101D35;padding:22px 28px;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                                <td align="left" valign="middle">
                                    <div style="font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;letter-spacing:0.4px;color:#FFFFFF;">
                                        Krevia Digital
                                    </div>
                                    <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#CBD5E1;margin-top:2px;">
                                        Digital Management System (DMS)
                                    </div>
                                </td>
                                @if(!empty($categoryBadge))
                                <td align="right" valign="middle">
                                    <span style="display:inline-block;background-color:#1E3A5F;border:1px solid #3B82F6;color:#FFFFFF;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:bold;padding:4px 10px;border-radius:999px;text-transform:uppercase;letter-spacing:0.5px;">
                                        {{ $categoryBadge }}
                                    </span>
                                </td>
                                @endif
                            </tr>
                        </table>
                    </td>
                </tr>

                <!-- Accent Bar -->
                <tr>
                    <td style="height:3px;background-color:#3B82F6;font-size:0;line-height:0;">&nbsp;</td>
                </tr>

                <!-- Main Body -->
                <tr>
                    <td style="padding:28px;">
                        @if(!empty($headline))
                            <h1 style="margin:0 0 14px 0;font-family:Arial,Helvetica,sans-serif;font-size:20px;line-height:28px;font-weight:bold;color:#101D35;">
                                {{ $headline }}
                            </h1>
                        @endif

                        <p style="margin:0 0 14px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:22px;color:#1E293B;">
                            Halo <strong>{{ $recipientName ?? 'Tim Krevia Digital' }}</strong>,
                        </p>

                        <div style="margin:0 0 18px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:22px;color:#1E293B;">
                            @yield('content')
                        </div>

                        @if(!empty($details) && is_array($details))
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 22px 0;background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;">
                                <tr>
                                    <td style="padding:14px 16px;">
                                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                            @foreach($details as $label => $value)
                                                @if($value !== null && $value !== '')
                                                <tr>
                                                    <td width="38%" valign="top" style="padding:5px 8px 5px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:bold;color:#64748B;">
                                                        {{ $label }}
                                                    </td>
                                                    <td width="62%" valign="top" style="padding:5px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1E293B;">
                                                        {{ $value }}
                                                    </td>
                                                </tr>
                                                @endif
                                            @endforeach
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        @endif

                        @if(!empty($actionLabel) && !empty($actionUrl))
                            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px 0;">
                                <tr>
                                    <td align="center" style="border-radius:6px;background-color:#101D35;">
                                        <a href="{{ $actionUrl }}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:12px 22px;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;color:#FFFFFF;text-decoration:none;border-radius:6px;">
                                            {{ $actionLabel }}
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        @endif

                        @if(!empty($secondaryText))
                            <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#64748B;">
                                {{ $secondaryText }}
                            </p>
                        @endif
                    </td>
                </tr>

                <!-- Footer -->
                <tr>
                    <td style="background-color:#F8FAFC;border-top:1px solid #E2E8F0;padding:18px 28px;">
                        <p style="margin:0 0 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#64748B;">
                            This is an automated notification from Krevia Digital DMS.
                        </p>
                        <p style="margin:0 0 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#64748B;">
                            Support: <a href="mailto:support@kreviadigitalid.my.id" style="color:#3B82F6;text-decoration:none;">support@kreviadigitalid.my.id</a>
                        </p>
                        <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:16px;color:#94A3B8;">
                            &copy; {{ date('Y') }} Krevia Digital. All rights reserved.
                        </p>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>
</body>
</html>
