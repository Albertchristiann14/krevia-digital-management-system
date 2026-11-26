@extends('emails.layouts.master')

@section('content')
    <p style="margin:0 0 10px 0;">
        Terdapat pengumuman baru yang dipublikasikan melalui Krevia Digital DMS:
    </p>
    <p style="margin:0;white-space:pre-line;color:#1E293B;">{{ $bodyText }}</p>
@endsection
