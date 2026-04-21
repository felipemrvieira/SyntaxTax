package schemas

import "time"

type OrderItemInput struct {
	ProductID *uint `json:"product_id"`
	Quantity  *int  `json:"quantity"`
}

type OrderInput struct {
	UserID *uint            `json:"user_id"`
	Items  []OrderItemInput `json:"items"`
}

type OrderStatusInput struct {
	Status string `json:"status"`
}

type OrderUserResponse struct {
	ID   uint   `json:"id"`
	Name string `json:"name"`
}

type OrderItemResponse struct {
	ProductID uint    `json:"product_id"`
	Quantity  int     `json:"quantity"`
	UnitPrice float64 `json:"unit_price"`
}

type OrderResponse struct {
	ID        uint                `json:"id"`
	User      OrderUserResponse   `json:"user"`
	Items     []OrderItemResponse `json:"items"`
	Total     float64             `json:"total"`
	Status    string              `json:"status"`
	CreatedAt time.Time           `json:"created_at"`
}
