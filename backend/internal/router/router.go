package router

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"

	"abys/docs"
	"abys/internal/config"
	"abys/internal/handler"
	"abys/internal/middleware"
	"abys/internal/repository"
	"abys/internal/service"
)

// Repos agrupa los repositorios construidos en Setup.
type Repos struct {
	Pago      *repository.PagoRepo
	Fuente    *repository.FuenteRepo
	Cuenta    *repository.CuentaRepo
	Split     *repository.SplitRepo
	Dashboard *repository.DashboardRepo
	Health    *repository.HealthRepo
}

// Services agrupa los servicios construidos en Setup.
type Services struct {
	Pago      *service.PagoService
	Fuente    *service.FuenteService
	Cuenta    *service.CuentaService
	Tasa      *service.TasaService
	Split     *service.SplitService
	Dashboard *service.DashboardService
}

// Setup construye repos, servicios y el router desde el pool.
func Setup(cfg *config.Config, pool *pgxpool.Pool) *gin.Engine {
	repos := &Repos{
		Pago:      repository.NewPagoRepo(pool),
		Fuente:    repository.NewFuenteRepo(pool),
		Cuenta:    repository.NewCuentaRepo(pool),
		Split:     repository.NewSplitRepo(pool),
		Dashboard: repository.NewDashboardRepo(pool),
		Health:    repository.NewHealthRepo(pool),
	}
	services := &Services{
		Pago:   service.NewPagoService(repos.Pago),
		Fuente: service.NewFuenteService(repos.Fuente),
		Cuenta: service.NewCuentaService(repos.Cuenta),
		Split:  service.NewSplitService(repos.Split, repos.Pago, repos.Cuenta),
	}
	services.Tasa = service.NewTasaService(repos.Cuenta, services.Split)
	services.Dashboard = service.NewDashboardService(repos.Dashboard)

	up := &handler.Uploader{
		Dir:      cfg.UploadDir,
		MaxBytes: cfg.MaxUploadSize * 1024 * 1024,
	}

	r := gin.New()
	r.Use(middleware.Logger(), middleware.Recovery(), middleware.CORS(cfg.CORSOrigins))

	// Estáticos: uploads (no-cache) + Swagger.
	r.Static("/uploads", cfg.UploadDir)
	docs.SwaggerInfo.BasePath = "/api/v1"
	r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	api := r.Group("/api/v1")

	// Registro de handlers.
	pagoH := handler.NewPagoHandler(services.Pago, up)
	fuenteH := handler.NewFuenteHandler(services.Fuente)
	cuentaH := handler.NewCuentaHandler(services.Cuenta, services.Tasa, repos.Cuenta, up)
	splitH := handler.NewSplitHandler(services.Split, repos.Split)
	dashH := handler.NewDashboardHandler(services.Dashboard)
	healthH := handler.NewHealthHandler(repos.Health)

	// Health.
	api.GET("/health", healthH.Ping)
	api.GET("/health/db", healthH.DB)

	// Pagos + días + comprobante.
	api.POST("/pagos", pagoH.Crear)
	api.GET("/pagos", pagoH.Listar)
	api.GET("/pagos/:id", pagoH.Detalle)
	api.PUT("/pagos/:id", pagoH.Actualizar)
	api.DELETE("/pagos/:id", pagoH.Eliminar)
	api.POST("/pagos/:id/dias", pagoH.AgregarDia)
	api.DELETE("/pagos/:id/dias/:diaId", pagoH.EliminarDia)
	api.POST("/pagos/:id/comprobante", pagoH.SubirComprobante)
	api.GET("/pagos/:id/split", splitH.PorPago)

	// Fuentes.
	api.POST("/fuentes", fuenteH.Crear)
	api.GET("/fuentes", fuenteH.Listar)
	api.PUT("/fuentes/:id", fuenteH.Actualizar)
	api.DELETE("/fuentes/:id", fuenteH.Eliminar)

	// Cuentas + QR + historial + tasa.
	api.POST("/cuentas", cuentaH.Crear)
	api.GET("/cuentas", cuentaH.Listar)
	api.GET("/cuentas/:id", cuentaH.Detalle)
	api.PUT("/cuentas/:id", cuentaH.Actualizar)
	api.DELETE("/cuentas/:id", cuentaH.Eliminar)
	api.POST("/cuentas/:id/qr", cuentaH.SubirQR)
	api.DELETE("/cuentas/:id/qr", cuentaH.EliminarQR)
	api.GET("/cuentas/:id/historial-tasas", cuentaH.HistorialTasas)
	api.PUT("/cuentas/:id/tasa", cuentaH.CambiarTasa)

	// Splits + transacciones.
	api.POST("/splits", splitH.Generar)
	api.GET("/splits", splitH.Listar)
	api.GET("/splits/:id", splitH.Detalle)
	api.PUT("/splits/:id", splitH.Recalcular)
	api.DELETE("/splits/:id", splitH.Eliminar)
	api.GET("/transacciones", splitH.ListarTransacciones)
	api.PUT("/transacciones/:id/realizar", splitH.MarcarRealizada)

	// Dashboard.
	api.GET("/dashboard/summary", dashH.Summary)
	api.GET("/dashboard/weekly", dashH.Weekly)
	api.GET("/dashboard/monthly", dashH.Monthly)
	api.GET("/dashboard/yearly", dashH.Yearly)
	api.GET("/dashboard/history", dashH.History)

	// 404 en formato JSON consistente.
	r.NoRoute(func(c *gin.Context) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{"code": "NOT_FOUND", "message": "ruta no encontrada: " + c.Request.URL.Path},
		})
	})
	return r
}