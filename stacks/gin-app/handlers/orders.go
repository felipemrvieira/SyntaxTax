package handlers

import (
	"errors"
	"net/http"
	"time"

	"syntaxtax-gin-app/models"
	"syntaxtax-gin-app/schemas"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func RegisterOrderRoutes(router gin.IRouter, db *gorm.DB) {
	router.POST("/orders", func(c *gin.Context) {
		var payload schemas.OrderInput
		if !bindJSON(c, &payload) {
			return
		}

		if payload.UserID == nil {
			c.JSON(http.StatusUnprocessableEntity, gin.H{"detail": "Field 'user_id' is required"})
			return
		}
		if len(payload.Items) == 0 {
			c.JSON(http.StatusUnprocessableEntity, gin.H{"detail": "Order must contain at least one item"})
			return
		}

		for _, item := range payload.Items {
			if item.ProductID == nil {
				c.JSON(http.StatusUnprocessableEntity, gin.H{"detail": "Field 'product_id' is required"})
				return
			}
			if item.Quantity == nil || *item.Quantity <= 0 {
				c.JSON(http.StatusUnprocessableEntity, gin.H{"detail": "Field 'quantity' must be greater than zero"})
				return
			}
		}

		var user models.User
		if err := db.First(&user, *payload.UserID).Error; errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"detail": "User not found"})
			return
		} else if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"detail": "Could not fetch user"})
			return
		}

		productIDs := uniqueProductIDs(payload.Items)
		var products []models.Product
		if err := db.Where("id IN ?", productIDs).Find(&products).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"detail": "Could not fetch products"})
			return
		}
		if len(products) != len(productIDs) {
			c.JSON(http.StatusNotFound, gin.H{"detail": "Product not found"})
			return
		}

		productsByID := make(map[uint]models.Product, len(products))
		for _, product := range products {
			productsByID[product.ID] = product
		}

		total := 0.0
		for _, item := range payload.Items {
			product := productsByID[*item.ProductID]
			total += product.Price * float64(*item.Quantity)
		}

		order := models.Order{
			UserID:    user.ID,
			Total:     total,
			Status:    "created",
			CreatedAt: time.Now().UTC(),
		}

		err := db.Transaction(func(tx *gorm.DB) error {
			if err := tx.Create(&order).Error; err != nil {
				return err
			}

			for _, item := range payload.Items {
				product := productsByID[*item.ProductID]
				orderItem := models.OrderItem{
					OrderID:   order.ID,
					ProductID: product.ID,
					Quantity:  *item.Quantity,
					UnitPrice: product.Price,
				}
				if err := tx.Create(&orderItem).Error; err != nil {
					return err
				}
			}

			return nil
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"detail": "Could not create order"})
			return
		}

		detailedOrder, err := loadOrder(db, order.ID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"detail": "Could not load order"})
			return
		}

		c.JSON(http.StatusCreated, serializeOrder(detailedOrder))
	})

	router.GET("/orders", func(c *gin.Context) {
		var orders []models.Order
		if err := db.Preload("User").Preload("Items", orderedItems).Order("id asc").Find(&orders).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"detail": "Could not list orders"})
			return
		}

		response := make([]schemas.OrderResponse, 0, len(orders))
		for _, order := range orders {
			response = append(response, serializeOrder(order))
		}

		c.JSON(http.StatusOK, response)
	})

	router.GET("/orders/:id", func(c *gin.Context) {
		orderID, ok := parseUintParam(c, "id")
		if !ok {
			return
		}

		order, err := loadOrder(db, orderID)
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"detail": "Order not found"})
			return
		}
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"detail": "Could not fetch order"})
			return
		}

		c.JSON(http.StatusOK, serializeOrder(order))
	})

	router.PATCH("/orders/:id/status", func(c *gin.Context) {
		orderID, ok := parseUintParam(c, "id")
		if !ok {
			return
		}

		var payload schemas.OrderStatusInput
		if !bindJSON(c, &payload) {
			return
		}

		if payload.Status == "" {
			c.JSON(http.StatusUnprocessableEntity, gin.H{"detail": "Field 'status' is required"})
			return
		}

		var order models.Order
		if err := db.First(&order, orderID).Error; errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"detail": "Order not found"})
			return
		} else if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"detail": "Could not fetch order"})
			return
		}

		order.Status = payload.Status
		if err := db.Save(&order).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"detail": "Could not update order"})
			return
		}

		detailedOrder, err := loadOrder(db, order.ID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"detail": "Could not load order"})
			return
		}

		c.JSON(http.StatusOK, serializeOrder(detailedOrder))
	})
}

func uniqueProductIDs(items []schemas.OrderItemInput) []uint {
	seen := make(map[uint]struct{}, len(items))
	ids := make([]uint, 0, len(items))

	for _, item := range items {
		if item.ProductID == nil {
			continue
		}
		if _, exists := seen[*item.ProductID]; exists {
			continue
		}

		seen[*item.ProductID] = struct{}{}
		ids = append(ids, *item.ProductID)
	}

	return ids
}

func orderedItems(db *gorm.DB) *gorm.DB {
	return db.Order("id asc")
}

func loadOrder(db *gorm.DB, id uint) (models.Order, error) {
	var order models.Order
	err := db.Preload("User").Preload("Items", orderedItems).First(&order, id).Error
	return order, err
}

func serializeOrder(order models.Order) schemas.OrderResponse {
	items := make([]schemas.OrderItemResponse, 0, len(order.Items))
	for _, item := range order.Items {
		items = append(items, schemas.OrderItemResponse{
			ProductID: item.ProductID,
			Quantity:  item.Quantity,
			UnitPrice: item.UnitPrice,
		})
	}

	return schemas.OrderResponse{
		ID: order.ID,
		User: schemas.OrderUserResponse{
			ID:   order.User.ID,
			Name: order.User.Name,
		},
		Items:     items,
		Total:     order.Total,
		Status:    order.Status,
		CreatedAt: order.CreatedAt,
	}
}
