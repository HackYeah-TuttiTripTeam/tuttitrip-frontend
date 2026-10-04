import { CloudOff, KeyRound, ShieldCheck, TriangleAlert } from '@keyline-icons/react'
import { getRouteApi } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import type { ParametersVersion } from '@/api/queries/planning-parameters'
import { ParametersForm } from '@/components/planning/parameters-form'
import { VersionHistory } from '@/components/planning/version-history'
import { PaginationBar } from '@/components/shared/pagination-bar'
import { StatusMessage } from '@/components/shared/status-message'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAdminAccess } from '@/hooks/use-admin-access'
import { useClampPage, useListSearch } from '@/hooks/use-list-search'
import { usePlanningParameters } from '@/hooks/use-planning-parameters'
import { useSaveParameters } from '@/hooks/use-save-parameters'
import { useSession } from '@/hooks/use-session'
import { toFormValues } from '@/lib/planning-parameters'
import { m } from '@/paraglide/messages'

const route = getRouteApi('/admin/planning')

/** The administrator's view of the algorithm parameters: the version in force, a form, the history. */
export function PlanningView() {
  const session = useSession()
  const navigate = route.useNavigate()
  const { search, setPage, setSize } = useListSearch(route, { filterDefaults: {} })
  const access = useAdminAccess(session.status)
  const allowed = access.level !== 'NONE'
  const readOnly = access.level !== 'WRITE'
  const data = usePlanningParameters(allowed, search)
  const save = useSaveParameters()
  const [loaded, setLoaded] = useState<ParametersVersion | null>(null)
  const [savedVersion, setSavedVersion] = useState<number | null>(null)
  useClampPage(search.page, data.versions?.pages, setPage)

  // Somebody without the permission has nothing to do here: back to the trips.
  const denied = access.ready && access.level === 'NONE'
  useEffect(() => {
    if (denied) void navigate({ to: '/trips', replace: true })
  }, [denied, navigate])

  const needsLogin = session.status === 'anonymous'
  const waiting = session.status === 'loading' || access.isPending || denied
  const problem = access.problem ?? data.problem

  if (needsLogin) {
    return (
      <Shell>
        <StatusMessage
          icon={<KeyRound />}
          title={m.trips_login_required_title()}
          action={<Button onClick={session.login}>{m.account_login()}</Button>}
        >
          {m.planning_login_required()}
        </StatusMessage>
      </Shell>
    )
  }
  if (problem) {
    const offline = problem === 'offline'
    return (
      <Shell>
        <StatusMessage
          role="alert"
          icon={offline ? <CloudOff /> : <TriangleAlert />}
          title={offline ? m.trips_offline_title() : m.planning_load_failed_title()}
          action={
            <Button variant="outline" onClick={data.refetch}>
              {m.action_retry()}
            </Button>
          }
        >
          {offline ? m.trips_offline_body() : m.planning_load_failed_body()}
        </StatusMessage>
      </Shell>
    )
  }
  if (waiting || data.isPending || !data.current) {
    return (
      <Shell>
        <PlanningSkeleton />
      </Shell>
    )
  }

  const current = data.current
  const initial = toFormValues(loaded?.values ?? current.values)

  return (
    <Shell version={current.version}>
      <div className="flex max-w-2xl flex-col gap-6">
        <p className="border-warning border-l-2 pl-3 text-sm leading-relaxed">
          {m.planning_uncalibrated()}
        </p>
        <p className="text-muted-foreground text-sm leading-relaxed">{m.planning_effect()}</p>
        {readOnly && (
          <p role="status" className="flex items-center gap-2 text-sm">
            <ShieldCheck aria-hidden="true" className="size-4 shrink-0" />
            {m.planning_readonly()}
          </p>
        )}
        {savedVersion !== null && !loaded && (
          <p role="status" className="text-primary text-sm">
            {m.planning_saved({ version: savedVersion })}
          </p>
        )}
        {loaded && (
          <p role="status" className="flex flex-wrap items-center gap-x-3 text-sm">
            {m.planning_loaded({ version: loaded.version })}
            <Button
              variant="ghost"
              className="h-11 px-2 md:h-8"
              onClick={() => {
                setLoaded(null)
                save.reset()
              }}
            >
              {m.planning_loaded_back()}
            </Button>
          </p>
        )}
      </div>

      <div className="max-w-3xl">
        <ParametersForm
          key={`${current.version}:${loaded?.version ?? 'current'}`}
          initial={initial}
          current={current.values}
          readOnly={readOnly}
          fieldErrors={save.fieldErrors}
          submitError={save.submitError}
          isSubmitting={save.isPending}
          onSubmit={async (values) => {
            const stored = await save.submit(values)
            if (stored) {
              setLoaded(null)
              setSavedVersion(stored.version)
            }
          }}
        />
      </div>

      <section aria-labelledby="planning-history" className="flex max-w-3xl flex-col gap-4">
        <h2 id="planning-history" className="font-heading font-semibold text-xl">
          {m.planning_history_title()}
        </h2>
        {data.historyPending ? (
          <Skeleton className="h-24 w-full" />
        ) : data.historyProblem ? (
          <StatusMessage
            role="alert"
            icon={<TriangleAlert />}
            title={m.planning_history_failed_title()}
            action={
              <Button variant="outline" onClick={data.refetch}>
                {m.action_retry()}
              </Button>
            }
          >
            {m.planning_load_failed_body()}
          </StatusMessage>
        ) : data.versions && data.versions.total > 0 ? (
          <>
            <VersionHistory
              versions={data.versions.items}
              currentVersion={current.version}
              onLoad={readOnly ? undefined : setLoaded}
            />
            <PaginationBar
              page={data.versions.page}
              pages={data.versions.pages}
              size={data.versions.size}
              total={data.versions.total}
              onPageChange={setPage}
              onSizeChange={setSize}
            />
          </>
        ) : (
          <p className="text-muted-foreground text-sm">{m.planning_history_empty()}</p>
        )}
      </section>
    </Shell>
  )
}

function Shell({ version, children }: { version?: number; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading font-semibold text-3xl tracking-tight">{m.planning_title()}</h1>
        <p className="text-muted-foreground text-sm" aria-live="polite">
          {version === undefined ? m.planning_subtitle() : m.planning_in_force_line({ version })}
        </p>
      </div>
      {children}
    </div>
  )
}

function PlanningSkeleton() {
  return (
    <div className="flex max-w-3xl flex-col gap-6" aria-busy="true">
      <Skeleton className="h-6 w-2/3" />
      {Array.from({ length: 4 }, (_, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: a fixed placeholder list has no identity
        <Skeleton key={index} className="h-20 w-full" />
      ))}
    </div>
  )
}
