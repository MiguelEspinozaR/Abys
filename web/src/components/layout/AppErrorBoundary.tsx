import { Component, type ReactNode } from "react"
import { ErrorPage } from "@/components/layout/ErrorPage"

interface AppErrorBoundaryProps {
  children: ReactNode
}

interface AppErrorBoundaryState {
  error: unknown
}

/** Última red para errores de render fuera del router; no usa hooks de navegación. */
export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: unknown): AppErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error): void {
    console.error("Error no controlado en la aplicación", error.message)
  }

  render(): ReactNode {
    if (this.state.error !== null) {
      return <ErrorPage error={this.state.error} />
    }
    return this.props.children
  }
}
