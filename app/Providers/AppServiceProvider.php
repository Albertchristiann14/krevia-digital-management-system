<?php

namespace App\Providers;

use App\Domain\Crm\Models\Lead;
use App\Domain\Finance\Models\Invoice;
use App\Domain\Governance\Models\Risk;
use App\Domain\Kpi\Models\KpiDefinition;
use App\Domain\Marketing\Models\ContentItem;
use App\Domain\Organization\Models\EmployeeProfile;
use App\Domain\Portfolio\Models\DemoProduct;
use App\Domain\Project\Models\Project;
use App\Domain\Workplan\Models\AnnualRoadmap;
use App\Domain\Workplan\Models\Task;
use App\Domain\Workspace\Models\Document;
use App\Policies\CrmPolicy;
use App\Policies\DemoProductPolicy;
use App\Policies\DocumentPolicy;
use App\Policies\FinancePolicy;
use App\Policies\GovernancePolicy;
use App\Policies\KpiPolicy;
use App\Policies\MarketingPolicy;
use App\Policies\OrganizationPolicy;
use App\Policies\ProjectPolicy;
use App\Policies\TaskPolicy;
use App\Policies\WorkplanPolicy;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        Model::preventLazyLoading(! app()->isProduction());

        Gate::policy(EmployeeProfile::class, OrganizationPolicy::class);
        Gate::policy(Task::class, TaskPolicy::class);
        Gate::policy(AnnualRoadmap::class, WorkplanPolicy::class);
        Gate::policy(Lead::class, CrmPolicy::class);
        Gate::policy(Project::class, ProjectPolicy::class);
        Gate::policy(DemoProduct::class, DemoProductPolicy::class);
        Gate::policy(ContentItem::class, MarketingPolicy::class);
        Gate::policy(Invoice::class, FinancePolicy::class);
        Gate::policy(KpiDefinition::class, KpiPolicy::class);
        Gate::policy(Risk::class, GovernancePolicy::class);
        Gate::policy(Document::class, DocumentPolicy::class);

        Gate::define('organization.view', fn ($user) => $user->hasPermissionTo('organization.view'));
        Gate::define('organization.manage', fn ($user) => $user->hasPermissionTo('organization.manage'));
        Gate::define('roles.manage', fn ($user) => $user->hasPermissionTo('roles.manage'));
        Gate::define('audit.view', fn ($user) => $user->hasPermissionTo('audit.view'));
        Gate::define('manage-finance', fn ($user) => $user->canManageFinance());
        Gate::define('manage-accounts', fn ($user) => $user->canManageAccounts());
    }
}
