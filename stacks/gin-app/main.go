package main

import (
	"syntaxtax-gin-app/db"
	"syntaxtax-gin-app/handlers"

	"github.com/gin-gonic/gin"
)

func main() {
	database, err := db.Open()
	if err != nil {
		panic(err)
	}

	router := gin.Default()
	handlers.RegisterUserRoutes(router, database)
	handlers.RegisterProductRoutes(router, database)
	handlers.RegisterOrderRoutes(router, database)

	if err := router.Run(":8000"); err != nil {
		panic(err)
	}
}
