@extends('emails.layouts.master')

@section('content')
    <p style="margin:0 0 10px 0;">
        {{ $introText }}
    </p>
    @if(!empty($messageText))
        <p style="margin:0;color:#1E293B;">{{ $messageText }}</p>
    @endif
@endsection
