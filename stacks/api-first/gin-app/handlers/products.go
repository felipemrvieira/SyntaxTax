package handlers

import (
	"errors"
	"net/http"
	"strconv"
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
		if *payload.Price <= 0 {
			c.JSON(http.StatusUnprocessableEntity, gin.H{"detail": "Field 'price' must be greater than zero"})
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
		query := db.Order("id asc")

		if rawMinPrice := c.Query("min_price"); rawMinPrice != "" {
			minPrice, err := strconv.ParseFloat(rawMinPrice, 64)
			if err != nil || minPrice <= 0 {
				c.JSON(http.StatusUnprocessableEntity, gin.H{"detail": "Query parameter 'min_price' is invalid"})
				return
			}
			query = query.Where("price >= ?", minPrice)
		}

		if rawMaxPrice := c.Query("max_price"); rawMaxPrice != "" {
			maxPrice, err := strconv.ParseFloat(rawMaxPrice, 64)
			if err != nil || maxPrice <= 0 {
				c.JSON(http.StatusUnprocessableEntity, gin.H{"detail": "Query parameter 'max_price' is invalid"})
				return
			}
			query = query.Where("price <= ?", maxPrice)
		}

		var products []models.Product
		if err := query.Find(&products).Error; err != nil {
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
