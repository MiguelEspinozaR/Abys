import { formatBs } from "@/lib/format"

interface Props {
  active?: boolean
  label?: string | number
  payload?: Array<{ value: unknown; name?: string; color?: string }>
  formatter?: (value: number, name: string) => string
  labelFormatter?: (label: string, payload?: Array<Record<string, unknown>>) => string
}

/** Tooltip compartido para los charts del dashboard. */
export function ChartTooltip({ active, label, payload, formatter, labelFormatter }: Props) {
  if (!active || !payload || payload.length === 0) return null

  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
      {labelFormatter ? (
        <p className="mb-1 font-medium text-popover-foreground">
          {labelFormatter(String(label ?? ""), payload)}
        </p>
      ) : (
        <p className="mb-1 font-medium text-popover-foreground">{label}</p>
      )}
      <div className="space-y-0.5">
        {payload.map((p, i) => (
          <p key={i} className="flex items-center gap-2 text-foreground">
            <span
              className="inline-block size-2 rounded-full"
              style={{ backgroundColor: p.color }}
              aria-hidden
            />
            {formatter
              ? formatter(Number(p.value), String(p.name ?? ""))
              : formatBs(Number(p.value))}
          </p>
        ))}
      </div>
    </div>
  )
}