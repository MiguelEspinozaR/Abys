package model

import "time"

// Fuente es la entidad independiente de origen de ingresos (BR-020).
type Fuente struct {
	ID        int64      `json:"id"`
	Alias     string     `json:"alias"`
	Color     string     `json:"color"`
	LogoRuta  *string    `json:"logo_ruta"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
	DeletedAt *time.Time `json:"deleted_at,omitempty"`
}

// Pago es un ingreso laboral con sus días trabajados (BR-001..BR-007).
type Pago struct {
	ID           int64      `json:"id"`
	FuenteID     int64      `json:"fuente_id"`
	FechaPago    string     `json:"fecha_pago"` // DATE (YYYY-MM-DD)
	MontoEnteros int64      `json:"monto_enteros"`
	MetodoPago   string     `json:"metodo_pago"`
	Notas        *string    `json:"notas"`
	ImagenRuta   *string    `json:"imagen_ruta"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
	DeletedAt    *time.Time `json:"deleted_at,omitempty"`
}

// DiaTrabajado pertenece a un solo pago; fecha única por pago (BR-010).
type DiaTrabajado struct {
	ID     int64  `json:"id"`
	PagoID int64  `json:"pago_id"`
	Fecha  string `json:"fecha"` // DATE (YYYY-MM-DD)
}

// Cuenta de distribución (BR-040..BR-043). La tasa vigente NO se almacena
// aquí: se deriva del último historial_tasas.
type Cuenta struct {
	ID        int64      `json:"id"`
	Alias     string     `json:"alias"`
	Numero    *string    `json:"numero"`
	Banco     *string    `json:"banco"`
	QRRuta    *string    `json:"qr_ruta"`
	EsGeneral bool       `json:"es_general"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
	DeletedAt *time.Time `json:"deleted_at,omitempty"`
}

// HistorialTasa registra cada modificación de la tasa de una cuenta (BR-050).
type HistorialTasa struct {
	ID            int64     `json:"id"`
	CuentaID      int64     `json:"cuenta_id"`
	TasaBps       int64     `json:"tasa_bps"` // basis points: 20% = 2000
	AplicadaDesde time.Time `json:"aplicada_desde"`
	CreatedAt     time.Time `json:"created_at"`
}

// Split distribuye un pago entre cuentas (0..1 por pago, BR-030).
type Split struct {
	ID          int64     `json:"id"`
	PagoID      int64     `json:"pago_id"`
	ModoCalculo string    `json:"modo_calculo"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// Transaccion es la unidad de distribución (snapshot de alias y tasa).
type Transaccion struct {
	ID               int64      `json:"id"`
	SplitID          int64      `json:"split_id"`
	CuentaID         *int64     `json:"cuenta_id"`
	MontoEnteros     int64      `json:"monto_enteros"`
	TasaBps          int64      `json:"tasa_bps"`
	AliasSnapshot    string     `json:"alias_snapshot"`
	Realizado        bool       `json:"realizado"`
	FechaRealizacion *time.Time `json:"fecha_realizacion"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`
}