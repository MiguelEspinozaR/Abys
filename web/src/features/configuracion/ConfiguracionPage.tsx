import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { WalletCards } from "lucide-react"
import { FuentesTab } from "./FuentesTab"
import { CuentasTab } from "./CuentasTab"

export default function ConfiguracionPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Configuración</h1>
        <p className="text-sm text-muted-foreground">
          Administra fuentes de ingreso y cuentas de distribución.
        </p>
      </header>

      <Tabs defaultValue="cuentas">
        <TabsList>
          <TabsTrigger value="cuentas">
            <WalletCards className="mr-1.5 size-4" aria-hidden />
            Cuentas
          </TabsTrigger>
          <TabsTrigger value="fuentes">Fuentes</TabsTrigger>
        </TabsList>
        <TabsContent value="cuentas" className="mt-4">
          <CuentasTab />
        </TabsContent>
        <TabsContent value="fuentes" className="mt-4">
          <FuentesTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}