package handlers

import (
	"errors"
	"net/http"
	"syntaxtax-gin-app/models"
	"syntaxtax-gin-app/schemas"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func RegisterUserRoutes(router gin.IRouter, db *gorm.DB) {
	router.POST("/users", func(c *gin.Context) {
		var payload schemas.UserInput
		if !bindJSON(c, &payload) {
			return
		}

		if payload.Name == "" {
			c.JSON(http.StatusUnprocessableEntity, gin.H{"detail": "Field 'name' is required"})
			return
		}
		if payload.Email == "" {
			c.JSON(http.StatusUnprocessableEntity, gin.H{"detail": "Field 'email' is required"})
			return
		}

		user := models.User{Name: payload.Name, Email: payload.Email}
		if err := db.Create(&user).Error; err != nil {
			c.JSON(http.StatusUnprocessableEntity, gin.H{"detail": "Could not create user"})
			return
		}

		c.JSON(http.StatusCreated, serializeUser(user))
	})

	router.GET("/users", func(c *gin.Context) {
		var users []models.User
		if err := db.Order("id asc").Find(&users).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"detail": "Could not list users"})
			return
		}

		response := make([]schemas.UserResponse, 0, len(users))
		for _, user := range users {
			response = append(response, serializeUser(user))
		}

		c.JSON(http.StatusOK, response)
	})

	router.GET("/users/:id", func(c *gin.Context) {
		userID, ok := parseUintParam(c, "id")
		if !ok {
			return
		}

		var user models.User
		if err := db.First(&user, userID).Error; errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"detail": "User not found"})
			return
		} else if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"detail": "Could not fetch user"})
			return
		}

		c.JSON(http.StatusOK, serializeUser(user))
	})
}

func serializeUser(user models.User) schemas.UserResponse {
	return schemas.UserResponse{
		ID:    user.ID,
		Name:  user.Name,
		Email: user.Email,
	}
}
