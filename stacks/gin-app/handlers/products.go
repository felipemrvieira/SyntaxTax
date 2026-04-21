package handlers

import (
	"errors"
	"net/http"
	"syntaxtax-gin-app/models"
	"syntaxtax-gin-app/schemas"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func RegisterProductRoutes(router gin.IRouter, db *gorm.DB) {
	router.POST("/products", func(c *gin.Context) {
		var payload schemas.ProductInput
		if !bindJSON(c, &payload) {
			return
		}

		if payload.Name == "" {
			c.JSON(http.StatusUnprocessableEntity, gin.H{"detail": "Field 'name' is required"})
			return
		}
		if payload.Price == nil {
			c.JSON(http.StatusUnprocessableEntity, gin.H{"detail": "Field 'price' must be numeric"})
			return
		}

		product := models.Product{Name: payload.Name, Price: *payload.Price}
		if err := db.Create(&product).Error; err != nil {
			c.JSON(http.StatusUnprocessableEntity, gin.H{"detail": "Could not create product"})
			return
		}

		c.JSON(http.StatusCreated, serializeProduct(product))
	})

	router.GET("/products", func(c *gin.Context) {
		var products []models.Product
		if err := db.Order("id asc").Find(&products).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"detail": "Could not list products"})
			return
		}

		response := make([]schemas.ProductResponse, 0, len(products))
		for _, product := range products {
			response = append(response, serializeProduct(product))
		}

		c.JSON(http.StatusOK, response)
	})

	router.GET("/products/:id", func(c *gin.Context) {
		productID, ok := parseUintParam(c, "id")
		if !ok {
			return
		}

		var product models.Product
		if err := db.First(&product, productID).Error; errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"detail": "Product not found"})
			return
		} else if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"detail": "Could not fetch product"})
			return
		}

		c.JSON(http.StatusOK, serializeProduct(product))
	})
}

func serializeProduct(product models.Product) schemas.ProductResponse {
	return schemas.ProductResponse{
		ID:    product.ID,
		Name:  product.Name,
		Price: product.Price,
	}
}
