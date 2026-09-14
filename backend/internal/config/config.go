package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

// Config agrupa toda la configuración de entorno del backend.
type Config struct {
	Port          string
	DBHost        string
	DBPort        string
	DBName        string
	DBUser        string
	DBPassword    string
	UploadDir     string
	MaxUploadSize int64 // en MB
	CORSOrigins   []string
	TimeZone      string
}

// Load lee .env (si existe) y las variables de entorno, aplicando defaults.
func Load() (*Config, error) {
	_ = godotenv.Load() // .env opcional en producción

	cfg := &Config{
		Port:          getEnv("PORT", "8080"),
		DBHost:        getEnv("DB_HOST", "localhost"),
		DBPort:        getEnv("DB_PORT", "5432"),
		DBName:        getEnv("DB_NAME", "abys"),
		DBUser:        getEnv("DB_USER", "postgres"),
		DBPassword:    os.Getenv("DB_PASSWORD"),
		UploadDir:     getEnv("UPLOAD_DIR", "./uploads"),
		MaxUploadSize: 10, // MB
		TimeZone:      getEnv("TIMEZONE", "America/La_Paz"),
	}

	if v := os.Getenv("MAX_UPLOAD_SIZE"); v != "" {
		n, err := strconv.ParseInt(v, 10, 64)
		if err != nil || n <= 0 {
			return nil, fmt.Errorf("MAX_UPLOAD_SIZE inválido: %q", v)
		}
		cfg.MaxUploadSize = n
	}

	for _, o := range strings.Split(getEnv("CORS_ORIGIN", "http://localhost:5173"), ",") {
		if o = strings.TrimSpace(o); o != "" {
			cfg.CORSOrigins = append(cfg.CORSOrigins, o)
		}
	}

	if cfg.DBPassword == "" {
		return nil, fmt.Errorf("DB_PASSWORD no configurada")
	}
	return cfg, nil
}

// DatabaseURL construye la conexión postgres para pgxpool.
func (c *Config) DatabaseURL() string {
	return fmt.Sprintf(
		"postgres://%s:%s@%s:%s/%s?sslmode=disable",
		c.DBUser, c.DBPassword, c.DBHost, c.DBPort, c.DBName,
	)
}

func getEnv(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}