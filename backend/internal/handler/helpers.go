package handler

import (
	"time"
)

// hoyLaPaz devuelve la fecha de hoy en America/La_Paz (YYYY-MM-DD).
func hoyLaPaz() string {
	loc, err := time.LoadLocation("America/La_Paz")
	if err != nil {
		return time.Now().Format("2006-01-02")
	}
	return time.Now().In(loc).Format("2006-01-02")
}