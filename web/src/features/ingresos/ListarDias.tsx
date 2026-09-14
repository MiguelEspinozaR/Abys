import { diaSemanaEs } from "@/lib/format"

export function ListarDias({ dias }: { dias: string[] }) {
  const ordenados = [...dias].sort()
  return (
    <ul className="flex flex-wrap gap-1.5">
      {ordenados.map((fecha) => (
        <li
          key={fecha}
          className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-0.5 text-xs"
        >
          {diaSemanaEs(fecha)} · {fecha}
        </li>
      ))}
    </ul>
  )
}