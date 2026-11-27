<?php

use App\Http\Controllers\AccessControlController;
use App\Http\Controllers\AccountingSuiteController;
use App\Http\Controllers\AnnouncementController;
use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\CrmController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DigitalIdentityController;
use App\Http\Controllers\DocumentController;
use App\Http\Controllers\FinanceController;
use App\Http\Controllers\GlobalSearchController;
use App\Http\Controllers\ImportExportController;
use App\Http\Controllers\KpiController;
use App\Http\Controllers\MarketingController;
use App\Http\Controllers\MeetingController;
use App\Http\Controllers\MyAccountController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\OrganizationController;
use App\Http\Controllers\PeopleController;
use App\Http\Controllers\PortfolioController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\RiskDecisionController;
use App\Http\Controllers\TaskController;
use App\Http\Controllers\UserAccountController;
use App\Http\Controllers\VirtualOfficeCommunicationController;
use App\Http\Controllers\VirtualOfficeController;
use App\Http\Controllers\VirtualOfficeMeetingController;
use App\Http\Controllers\VirtualOfficeObjectController;
use App\Http\Controllers\WorkplanController;
use Illuminate\Support\Facades\Route;

Route::get('/id/{token}', [DigitalIdentityController::class, 'showPublic'])
    ->middleware('throttle:30,1')
    ->name('identity.public');

Route::middleware('guest')->group(function () {
    Route::get('/login', [AuthenticatedSessionController::class, 'create'])->name('login');
    Route::post('/login', [AuthenticatedSessionController::class, 'store'])
        ->middleware('throttle:10,1')
        ->name('login.store');
});

Route::middleware(['auth', 'active.user'])->group(function () {
    Route::post('/logout', [AuthenticatedSessionController::class, 'destroy'])->name('logout');
    Route::put('/profile/password', [UserAccountController::class, 'updateOwnPassword'])->name('profile.password.update');

    Route::prefix('my-account')->name('my-account.')->group(function () {
        Route::get('/', [MyAccountController::class, 'index'])->name('index');
        Route::patch('/profile', [MyAccountController::class, 'updateProfile'])->name('profile.update');
        Route::post('/avatar', [MyAccountController::class, 'uploadAvatar'])->name('avatar.store');
        Route::delete('/avatar', [MyAccountController::class, 'removeAvatar'])->name('avatar.destroy');
        Route::put('/password', [MyAccountController::class, 'updatePassword'])->name('password.update');
        Route::delete('/sessions', [MyAccountController::class, 'destroyOtherSessions'])->name('sessions.destroy');
        Route::patch('/notifications', [MyAccountController::class, 'updateNotifications'])->name('notifications.update');
        Route::patch('/preferences', [MyAccountController::class, 'updatePreferences'])->name('preferences.update');
        Route::post('/identity/regenerate', [DigitalIdentityController::class, 'regenerate'])
            ->middleware('throttle:10,1')
            ->name('identity.regenerate');
        Route::patch('/identity/status', [DigitalIdentityController::class, 'toggleStatus'])
            ->middleware('throttle:10,1')
            ->name('identity.status');
        Route::patch('/identity/visibility', [DigitalIdentityController::class, 'updateVisibility'])
            ->name('identity.visibility');
    });

    Route::middleware('permission:organization.view')->group(function () {
        Route::get('/people', [PeopleController::class, 'index'])->name('people.index');
        Route::get('/people/{member}', [PeopleController::class, 'show'])->name('people.show');
        Route::post('/people/{member}/identity/regenerate', [DigitalIdentityController::class, 'regenerateForMember'])
            ->middleware('throttle:10,1')
            ->name('people.identity.regenerate');
        Route::patch('/people/{member}/identity/status', [DigitalIdentityController::class, 'toggleStatusForMember'])
            ->middleware('throttle:10,1')
            ->name('people.identity.status');
    });

    Route::get('/', fn () => redirect()->route('dashboard'));
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::get('/virtual-office', [VirtualOfficeController::class, 'index'])->name('virtual-office.index');
    Route::prefix('virtual-office/presence')->name('virtual-office.presence.')->group(function () {
        Route::get('/snapshot', [VirtualOfficeController::class, 'snapshot'])
            ->middleware('throttle:60,1')
            ->name('snapshot');
        Route::post('/heartbeat', [VirtualOfficeController::class, 'heartbeat'])
            ->middleware('throttle:60,1')
            ->name('heartbeat');
        Route::patch('/', [VirtualOfficeController::class, 'updatePresence'])
            ->middleware('throttle:30,1')
            ->name('update');
        Route::post('/disconnect', [VirtualOfficeController::class, 'disconnect'])
            ->middleware('throttle:30,1')
            ->name('disconnect');
        Route::post('/move', [VirtualOfficeController::class, 'move'])
            ->middleware('throttle:60,1')
            ->name('move');
        Route::post('/seat', [VirtualOfficeController::class, 'seat'])
            ->middleware('throttle:30,1')
            ->name('seat');
    });
    Route::prefix('virtual-office')->name('virtual-office.')->group(function () {
        Route::get('/messages', [VirtualOfficeCommunicationController::class, 'messages'])
            ->middleware('throttle:90,1')
            ->name('messages.index');
        Route::post('/messages', [VirtualOfficeCommunicationController::class, 'storeMessage'])
            ->middleware('throttle:45,1')
            ->name('messages.store');
        Route::patch('/messages/{message}', [VirtualOfficeCommunicationController::class, 'updateMessage'])
            ->middleware('throttle:30,1')
            ->name('messages.update');
        Route::delete('/messages/{message}', [VirtualOfficeCommunicationController::class, 'destroyMessage'])
            ->middleware('throttle:30,1')
            ->name('messages.destroy');
        Route::post('/messages/{message}/react', [VirtualOfficeCommunicationController::class, 'reactMessage'])
            ->middleware('throttle:60,1')
            ->name('messages.react');
        Route::post('/messages/read', [VirtualOfficeCommunicationController::class, 'markRead'])
            ->middleware('throttle:60,1')
            ->name('messages.read');
        Route::get('/knocks', [VirtualOfficeCommunicationController::class, 'knocks'])
            ->middleware('throttle:60,1')
            ->name('knocks.index');
        Route::post('/knocks', [VirtualOfficeCommunicationController::class, 'sendKnock'])
            ->middleware('throttle:20,1')
            ->name('knocks.store');
        Route::post('/knocks/{knock}/respond', [VirtualOfficeCommunicationController::class, 'respondKnock'])
            ->middleware('throttle:30,1')
            ->name('knocks.respond');
        Route::get('/meetings', [VirtualOfficeMeetingController::class, 'index'])
            ->middleware('throttle:60,1')
            ->name('meetings.index');
        Route::get('/meetings/slots', [VirtualOfficeMeetingController::class, 'slots'])
            ->middleware('throttle:60,1')
            ->name('meetings.slots');
        Route::post('/meetings/instant', [VirtualOfficeMeetingController::class, 'startInstant'])
            ->middleware('throttle:20,1')
            ->name('meetings.instant');
        Route::post('/meetings/schedule', [VirtualOfficeMeetingController::class, 'schedule'])
            ->middleware('throttle:20,1')
            ->name('meetings.schedule');
        Route::post('/meetings/{meeting}/join', [VirtualOfficeMeetingController::class, 'join'])
            ->middleware('throttle:30,1')
            ->name('meetings.join');
        Route::post('/meetings/{meeting}/leave', [VirtualOfficeMeetingController::class, 'leave'])
            ->middleware('throttle:30,1')
            ->name('meetings.leave');
        Route::post('/meetings/{meeting}/end', [VirtualOfficeMeetingController::class, 'end'])
            ->middleware('throttle:20,1')
            ->name('meetings.end');
        Route::post('/meetings/{meeting}/rsvp', [VirtualOfficeMeetingController::class, 'rsvp'])
            ->middleware('throttle:30,1')
            ->name('meetings.rsvp');
        Route::post('/meetings/{meeting}/notes', [VirtualOfficeMeetingController::class, 'saveNotes'])
            ->middleware('throttle:30,1')
            ->name('meetings.notes');
        Route::post('/meetings/{meeting}/action-items', [VirtualOfficeMeetingController::class, 'addActionItem'])
            ->middleware('throttle:30,1')
            ->name('meetings.action-items');
        Route::post('/action-items/{actionItem}/convert-task', [VirtualOfficeMeetingController::class, 'convertToTask'])
            ->middleware('throttle:30,1')
            ->name('action-items.convert-task');
        Route::post('/call/{user}', [VirtualOfficeMeetingController::class, 'quickCall'])
            ->middleware('throttle:20,1')
            ->name('call.quick');
        Route::get('/events', [VirtualOfficeMeetingController::class, 'events'])
            ->middleware('throttle:60,1')
            ->name('events.index');
        Route::get('/visitors', [VirtualOfficeObjectController::class, 'visitors'])
            ->middleware('throttle:60,1')
            ->name('visitors.index');
        Route::post('/visitors', [VirtualOfficeObjectController::class, 'checkInVisitor'])
            ->middleware('throttle:20,1')
            ->name('visitors.store');
        Route::post('/visitors/{visitor}/respond', [VirtualOfficeObjectController::class, 'respondVisitor'])
            ->middleware('throttle:30,1')
            ->name('visitors.respond');
        Route::get('/project-kanban', [VirtualOfficeObjectController::class, 'projectKanban'])
            ->middleware('throttle:60,1')
            ->name('project-kanban');
        Route::post('/coffee/{user}', [VirtualOfficeObjectController::class, 'inviteCoffee'])
            ->middleware('throttle:20,1')
            ->name('coffee.invite');
        Route::post('/break-time', [VirtualOfficeObjectController::class, 'breakTime'])
            ->middleware('throttle:20,1')
            ->name('break-time');
        Route::post('/focus-mode', [VirtualOfficeObjectController::class, 'focusMode'])
            ->middleware('throttle:30,1')
            ->name('focus-mode');
    });
    Route::get('/search', GlobalSearchController::class)->name('search.global');

    Route::get('/announcements', [AnnouncementController::class, 'index'])->name('announcements.index');
    Route::post('/announcements', [AnnouncementController::class, 'store'])->name('announcements.store');
    Route::patch('/announcements/{announcement}', [AnnouncementController::class, 'update'])->name('announcements.update');
    Route::delete('/announcements/{announcement}', [AnnouncementController::class, 'destroy'])->name('announcements.destroy');

    Route::get('/notifications', [NotificationController::class, 'index'])->name('notifications.index');
    Route::post('/notifications/{id}/read', [NotificationController::class, 'markRead'])->name('notifications.read');
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllRead'])->name('notifications.read-all');

    Route::prefix('workplan')->name('workplan.')->group(function () {
        Route::get('/roadmap', [WorkplanController::class, 'roadmap'])->name('roadmap');
        Route::post('/roadmap', [WorkplanController::class, 'storeRoadmap'])->name('roadmap.store');
        Route::patch('/roadmap/{roadmap}', [WorkplanController::class, 'updateRoadmap'])->name('roadmap.update');
        Route::delete('/roadmap/{roadmap}', [WorkplanController::class, 'destroyRoadmap'])->name('roadmap.destroy');
        Route::get('/monthly', [WorkplanController::class, 'monthly'])->name('monthly');
        Route::patch('/monthly/{monthlyWorkplan}/evaluation', [WorkplanController::class, 'updateMonthlyEvaluation'])->name('monthly.evaluation');
    });

    Route::get('/my-tasks', [TaskController::class, 'index'])->name('tasks.mine');

    Route::prefix('tasks')->name('tasks.')->group(function () {
        Route::get('/', [TaskController::class, 'index'])->name('index');
        Route::post('/', [TaskController::class, 'store'])->name('store');
        Route::post('/reorder', [TaskController::class, 'reorder'])->name('reorder');
        Route::get('/{task}', [TaskController::class, 'show'])->name('show');
        Route::patch('/{task}', [TaskController::class, 'update'])->name('update');
        Route::post('/{task}/transition', [TaskController::class, 'transition'])->name('transition');
        Route::delete('/{task}', [TaskController::class, 'destroy'])->name('destroy');

        Route::post('/{task}/subtasks', [TaskController::class, 'storeSubtask'])->name('subtasks.store');
        Route::post('/{task}/subtasks/{subtask}/toggle', [TaskController::class, 'toggleSubtask'])->name('subtasks.toggle');
        Route::delete('/{task}/subtasks/{subtask}', [TaskController::class, 'destroySubtask'])->name('subtasks.destroy');

        Route::post('/{task}/dependencies', [TaskController::class, 'storeDependency'])->name('dependencies.store');
        Route::delete('/{task}/dependencies/{dependency}', [TaskController::class, 'destroyDependency'])->name('dependencies.destroy');

        Route::post('/{task}/comments', [TaskController::class, 'storeComment'])->name('comments.store');

        Route::post('/{task}/evidences', [TaskController::class, 'storeEvidence'])->name('evidences.store');
        Route::get('/{task}/evidences/{evidence}/preview', [TaskController::class, 'previewEvidence'])->name('evidences.preview');
        Route::get('/{task}/evidences/{evidence}/download', [TaskController::class, 'downloadEvidence'])->name('evidences.download');
        Route::delete('/{task}/evidences/{evidence}', [TaskController::class, 'destroyEvidence'])->name('evidences.destroy');
    });

    Route::prefix('crm')->name('crm.')->group(function () {
        Route::get('/leads', [CrmController::class, 'index'])->name('leads.index');
        Route::post('/leads', [CrmController::class, 'store'])->name('leads.store');
        Route::post('/leads/reorder', [CrmController::class, 'reorder'])->name('leads.reorder');
        Route::get('/leads/{lead}', [CrmController::class, 'show'])->name('leads.show');
        Route::patch('/leads/{lead}', [CrmController::class, 'update'])->name('leads.update');
        Route::post('/leads/{lead}/stage', [CrmController::class, 'transitionStage'])->name('leads.stage');
        Route::post('/leads/{lead}/interactions', [CrmController::class, 'storeInteraction'])->name('leads.interactions.store');
        Route::post('/leads/{lead}/follow-ups', [CrmController::class, 'storeFollowUp'])->name('leads.followups.store');
        Route::post('/leads/{lead}/follow-ups/{followUp}/complete', [CrmController::class, 'completeFollowUp'])->name('leads.followups.complete');
        Route::post('/leads/{lead}/proposals', [CrmController::class, 'storeProposal'])->name('leads.proposals.store');
        Route::post('/leads/{lead}/convert', [CrmController::class, 'convertToProject'])->name('leads.convert');
        Route::get('/companies', [CrmController::class, 'companies'])->name('companies.index');
    });

    Route::prefix('projects')->name('projects.')->group(function () {
        Route::get('/', [ProjectController::class, 'index'])->name('index');
        Route::post('/', [ProjectController::class, 'store'])->name('store');
        Route::get('/{project}', [ProjectController::class, 'show'])->name('show');
        Route::post('/{project}/stages/{stage}/complete', [ProjectController::class, 'completeStage'])->name('stages.complete');
        Route::post('/{project}/requirements', [ProjectController::class, 'storeRequirement'])->name('requirements.store');
        Route::post('/{project}/qa-reports', [ProjectController::class, 'storeQaReport'])->name('qa-reports.store');
        Route::post('/{project}/uat-records', [ProjectController::class, 'storeUat'])->name('uat.store');
        Route::post('/{project}/releases', [ProjectController::class, 'storeRelease'])->name('releases.store');
        Route::post('/{project}/handover', [ProjectController::class, 'storeHandover'])->name('handover.store');
        Route::post('/{project}/tickets', [ProjectController::class, 'storeTicket'])->name('tickets.store');
        Route::post('/{project}/milestones', [ProjectController::class, 'storeMilestone'])->name('milestones.store');
    });

    Route::prefix('portfolio')->name('portfolio.')->group(function () {
        Route::get('/demos', [PortfolioController::class, 'index'])->name('index');
        Route::post('/demos', [PortfolioController::class, 'store'])->name('store');
        Route::get('/demos/{demo}', [PortfolioController::class, 'show'])->name('show');
        Route::patch('/demos/{demo}', [PortfolioController::class, 'update'])->name('update');
        Route::post('/demos/{demo}/status', [PortfolioController::class, 'transitionStatus'])->name('status');
        Route::post('/demos/{demo}/criteria/{criterion}', [PortfolioController::class, 'toggleCriterion'])->name('criteria.toggle');
        Route::post('/demos/{demo}/approve-technical', [PortfolioController::class, 'approveTechnical'])->name('approve-technical');
        Route::post('/demos/{demo}/approve-commercial', [PortfolioController::class, 'approveCommercial'])->name('approve-commercial');
        Route::post('/demos/{demo}/assets', [PortfolioController::class, 'storeAsset'])->name('assets.store');
        Route::get('/demos/{demo}/assets/{asset}/download', [PortfolioController::class, 'downloadAsset'])->name('assets.download');
    });

    Route::prefix('marketing')->name('marketing.')->group(function () {
        Route::get('/content', [MarketingController::class, 'index'])->name('index');
        Route::post('/content', [MarketingController::class, 'store'])->name('store');
        Route::get('/content/{contentItem}', [MarketingController::class, 'show'])->name('show');
        Route::patch('/content/{contentItem}', [MarketingController::class, 'update'])->name('update');
        Route::post('/content/{contentItem}/status', [MarketingController::class, 'transitionStatus'])->name('status');
        Route::post('/content/{contentItem}/review', [MarketingController::class, 'review'])->name('review');
        Route::post('/content/{contentItem}/assets', [MarketingController::class, 'storeAsset'])->name('assets.store');
        Route::get('/content/{contentItem}/assets/{asset}/download', [MarketingController::class, 'downloadAsset'])->name('assets.download');
        Route::post('/content/{contentItem}/metrics', [MarketingController::class, 'storeMetric'])->name('metrics.store');
    });

    Route::prefix('finance')->name('finance.')->group(function () {
        Route::get('/', [FinanceController::class, 'index'])->name('index');
        Route::get('/suite', [AccountingSuiteController::class, 'index'])->name('suite');
        Route::get('/my-compensations', [AccountingSuiteController::class, 'myCompensations'])->name('my-compensations');
        Route::post('/reimbursements', [AccountingSuiteController::class, 'storeReimbursement'])->name('reimbursements.store');
        Route::post('/expenses', [AccountingSuiteController::class, 'storeExpenseRequest'])->name('expenses.store');
        Route::get('/transactions/{transaction}/evidence', [FinanceController::class, 'downloadEvidence'])->name('transactions.evidence');

        Route::middleware('can:manage-finance')->group(function () {
            Route::patch('/settings', [FinanceController::class, 'updateSettings'])->name('settings.update');
            Route::patch('/budgets/{budget}', [FinanceController::class, 'updateBudget'])->name('budgets.update');
            Route::post('/invoices', [FinanceController::class, 'storeInvoice'])->name('invoices.store');
            Route::post('/invoices/{invoice}/void', [FinanceController::class, 'voidInvoice'])->name('invoices.void');
            Route::post('/invoices/{invoice}/payments', [FinanceController::class, 'recordPayment'])->name('invoices.payments.store');
            Route::post('/transactions', [FinanceController::class, 'storeTransaction'])->name('transactions.store');

            // Double-Entry Accounting & Operations Suite
            Route::post('/accounts', [AccountingSuiteController::class, 'storeAccount'])->name('accounts.store');
            Route::post('/journals', [AccountingSuiteController::class, 'storeJournal'])->name('journals.store');
            Route::post('/journals/{journal}/post', [AccountingSuiteController::class, 'postJournal'])->name('journals.post');
            Route::post('/journals/{journal}/reverse', [AccountingSuiteController::class, 'reverseJournal'])->name('journals.reverse');
            Route::post('/periods/{period}/close', [AccountingSuiteController::class, 'closePeriod'])->name('periods.close');
            Route::post('/periods/{period}/reopen', [AccountingSuiteController::class, 'reopenPeriod'])->name('periods.reopen');
            Route::post('/expenses/{expense}/pay', [AccountingSuiteController::class, 'payExpenseRequest'])->name('expenses.pay');
            Route::post('/compensations', [AccountingSuiteController::class, 'storeCompensation'])->name('compensations.store');
            Route::post('/compensations/{compensation}/pay', [AccountingSuiteController::class, 'payCompensation'])->name('compensations.pay');
            Route::post('/approvals/{approvalRequest}/approve', [AccountingSuiteController::class, 'approveRequest'])->name('approvals.approve');
            Route::post('/approvals/{approvalRequest}/reject', [AccountingSuiteController::class, 'rejectRequest'])->name('approvals.reject');
            Route::post('/transfers', [AccountingSuiteController::class, 'storeTransfer'])->name('transfers.store');
            Route::post('/subscriptions', [AccountingSuiteController::class, 'storeSubscription'])->name('subscriptions.store');
            Route::post('/subscriptions/{subscription}/bill', [AccountingSuiteController::class, 'billSubscription'])->name('subscriptions.bill');
            Route::post('/project-budgets', [AccountingSuiteController::class, 'storeProjectBudget'])->name('project-budgets.store');
        });
    });

    Route::prefix('kpi')->name('kpi.')->group(function () {
        Route::get('/', [KpiController::class, 'index'])->name('index');
        Route::put('/members/{member}/weights', [KpiController::class, 'updateWeights'])->name('weights.update');
        Route::post('/members/{member}/evaluations', [KpiController::class, 'storeEvaluation'])->name('evaluations.store');
        Route::post('/evaluations/{evaluation}/approve', [KpiController::class, 'approveEvaluation'])->name('evaluations.approve');
    });

    Route::prefix('governance')->name('governance.')->group(function () {
        Route::get('/meetings', [MeetingController::class, 'index'])->name('meetings.index');
        Route::post('/meetings', [MeetingController::class, 'store'])->name('meetings.store');
        Route::post('/meetings/{meeting}/agenda', [MeetingController::class, 'publishAgenda'])->name('meetings.agenda');
        Route::post('/meetings/{meeting}/minutes', [MeetingController::class, 'storeMinutes'])->name('meetings.minutes');
        Route::post('/meetings/{meeting}/action-items', [MeetingController::class, 'storeActionItem'])->name('meetings.action-items.store');
        Route::post('/action-items/{actionItem}/complete', [MeetingController::class, 'completeActionItem'])->name('action-items.complete');
        Route::post('/meetings/{meeting}/promote-decision', [MeetingController::class, 'promoteDecision'])->name('meetings.promote-decision');
        Route::post('/weekly-reports', [MeetingController::class, 'storeWeeklyReport'])->name('weekly-reports.store');
        Route::patch('/quarterly-reviews/{quarterlyReview}', [MeetingController::class, 'updateQuarterlyReview'])->name('quarterly-reviews.update');

        Route::get('/risks-decisions', [RiskDecisionController::class, 'index'])->name('risks-decisions.index');
        Route::post('/risks', [RiskDecisionController::class, 'storeRisk'])->name('risks.store');
        Route::post('/risks/{risk}/review', [RiskDecisionController::class, 'reviewRisk'])->name('risks.review');
        Route::post('/decisions', [RiskDecisionController::class, 'storeDecision'])->name('decisions.store');
        Route::post('/decisions/{decision}/approve', [RiskDecisionController::class, 'approveDecision'])->name('decisions.approve');
    });

    Route::prefix('documents')->name('documents.')->group(function () {
        Route::get('/', [DocumentController::class, 'index'])->name('index');
        Route::post('/', [DocumentController::class, 'store'])->name('store');
        Route::get('/{document}/download', [DocumentController::class, 'download'])->name('download');
        Route::delete('/{document}', [DocumentController::class, 'destroy'])->name('destroy');
    });

    Route::prefix('organization')->name('organization.')->group(function () {
        Route::get('/', [OrganizationController::class, 'index'])->name('index');
        Route::patch('/profiles/{employeeProfile}', [OrganizationController::class, 'updateProfile'])->name('profiles.update');
        Route::patch('/departments/{department}', [OrganizationController::class, 'updateDepartment'])->name('departments.update');
        Route::put('/raci/{raciActivity}', [OrganizationController::class, 'updateRaci'])->name('raci.update');
    });

    Route::prefix('admin')->name('admin.')->group(function () {
        Route::get('/roles', [AccessControlController::class, 'index'])->name('roles.index');
        Route::patch('/users/{user}/access', [AccessControlController::class, 'updateUserAccess'])->name('users.access.update');
        Route::put('/roles/{role}/permissions', [AccessControlController::class, 'updateRolePermissions'])->name('roles.permissions.update');
        Route::get('/audit-logs', [AccessControlController::class, 'auditLogs'])->name('audit-logs.index');
        Route::get('/imports', [ImportExportController::class, 'index'])->name('imports.index');
        Route::post('/imports/run', [ImportExportController::class, 'runImport'])->name('imports.run');
        Route::get('/imports/export', [ImportExportController::class, 'export'])->name('imports.export');

        Route::middleware('can:manage-accounts')->group(function () {
            Route::get('/accounts', [UserAccountController::class, 'index'])->name('accounts.index');
            Route::post('/accounts', [UserAccountController::class, 'store'])->name('accounts.store');
            Route::patch('/accounts/{user}', [UserAccountController::class, 'update'])->name('accounts.update');
            Route::post('/accounts/{user}/toggle-active', [UserAccountController::class, 'toggleActive'])->name('accounts.toggle-active');
            Route::put('/accounts/{user}/password', [UserAccountController::class, 'updatePassword'])->name('accounts.password.update');
            Route::delete('/accounts/{user}', [UserAccountController::class, 'destroy'])->name('accounts.destroy');
            Route::post('/accounts/{id}/restore', [UserAccountController::class, 'restore'])->name('accounts.restore');

            Route::get('/notifications-settings', [AnnouncementController::class, 'settings'])->name('notifications-settings.index');
            Route::patch('/notifications-settings', [AnnouncementController::class, 'updateSettings'])->name('notifications-settings.update');
            Route::post('/notifications-settings/test', [AnnouncementController::class, 'sendTest'])->name('notifications-settings.test');
        });
    });
});
