import { List, Map as MapIcon } from '@keyline-icons/react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { m } from '@/paraglide/messages'

export type PlanPane = 'list' | 'map'

interface PlanViewSwitchProps {
  value: PlanPane
  onChange: (value: PlanPane) => void
}

/** "Lista | Mapa" on phones, where the list and the map do not fit side by side. */
export function PlanViewSwitch({ value, onChange }: PlanViewSwitchProps) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      aria-label={m.plan_view_label()}
      className="w-full md:hidden"
      onValueChange={(next) => {
        if (next === 'list' || next === 'map') onChange(next)
      }}
    >
      <ToggleGroupItem value="list" className="gap-2">
        <List aria-hidden="true" className="size-4" />
        {m.plan_view_list()}
      </ToggleGroupItem>
      <ToggleGroupItem value="map" className="gap-2">
        <MapIcon aria-hidden="true" className="size-4" />
        {m.plan_view_map()}
      </ToggleGroupItem>
    </ToggleGroup>
  )
}
