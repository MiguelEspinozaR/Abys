import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SplitSquareHorizontal, WalletCards } from "lucide-react"
import { FuentesTab } from "./FuentesTab"
import { CuentasTab } from "./CuentasTab"
import { SplitsTab } from "./SplitsTab"

export default function ConfiguracionPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Configuración</h1>
        <p className="text-sm text-muted-foreground">
          Administra fuentes de ingreso, cuentas de distribución y splits.
        </p>
      </header>

      <Tabs defaultValue="cuentas">
        <TabsList>
          <TabsTrigger value="cuentas">
            <WalletCards className="mr-1.5 size-4" aria-hidden />
            Cuentas
          </TabsTrigger>
          <TabsTrigger value="fuentes">Fuentes</TabsTrigger>
          <TabsTrigger value="splits">
            <SplitSquareHorizontal className="mr-1.5 size-4" aria-hidden />
            Splits
          </TabsTrigger>
        </TabsList>
        <TabsContent value="cuentas" className="mt-4">
          <CuentasTab />
        </TabsContent>
        <TabsContent value="fuentes" className="mt-4">
          <FuentesTab />
        </TabsContent>
        <TabsContent value="splits" className="mt-4">
          <SplitsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}