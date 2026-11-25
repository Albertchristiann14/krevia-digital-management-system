<?php

namespace App\Policies;

use App\Domain\Workspace\Models\Document;
use App\Models\User;

class DocumentPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('documents.view');
    }

    public function view(User $user, Document $document): bool
    {
        return $user->hasPermissionTo('documents.view');
    }

    public function create(User $user): bool
    {
        return $user->hasPermissionTo('documents.upload');
    }

    public function delete(User $user, Document $document): bool
    {
        return $user->hasPermissionTo('documents.delete')
            || $document->uploaded_by === $user->id;
    }
}
