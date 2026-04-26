package schemas

type ProductInput struct {
	Name  string   `json:"name"`
	Price *float64 `json:"price"`
}

type ProductResponse struct {
	ID    uint    `json:"id"`
	Name  string  `json:"name"`
	Price float64 `json:"price"`
}
