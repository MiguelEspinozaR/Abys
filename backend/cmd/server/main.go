package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"abys/internal/config"
	"abys/internal/database"
	"abys/internal/router"
)

// @title Abys API
// @version 1.0
// @description API REST del backend Abys (pagos, fuentes, cuentas, splits, dashboard).
// @host localhost:8080
// @BasePath /api/v1
func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("[config] %v", err)
	}

	pool, err := database.Connect(context.Background(), cfg)
	if err != nil {
		log.Fatalf("[database] %v", err)
	}
	defer pool.Close()
	log.Printf("[database] conectado a %s@%s:%s/%s", cfg.DBUser, cfg.DBHost, cfg.DBPort, cfg.DBName)

	r := router.Setup(cfg, pool)

	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           r,
		ReadHeaderTimeout: 10 * time.Second,
	}

	go func() {
		log.Printf("[server] escuchando en :%s", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("[server] %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Printf("[server] error al apagar: %v", err)
	}
	log.Println("[server] apagado correctamente")
}