package db

import (
	"syntaxtax-gin-app/models"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

const databaseFile = "syntaxtax_gin.db"

func Open() (*gorm.DB, error) {
	db, err := gorm.Open(sqlite.Open(databaseFile), &gorm.Config{})
	if err != nil {
		return nil, err
	}

	if err := db.AutoMigrate(
		&models.User{},
		&models.Product{},
		&models.Order{},
		&models.OrderItem{},
	); err != nil {
		return nil, err
	}

	return db, nil
}
