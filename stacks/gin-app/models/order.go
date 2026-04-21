package models

import "time"

type Order struct {
	ID        uint        `gorm:"primaryKey"`
	UserID    uint        `gorm:"not null"`
	Total     float64     `gorm:"not null;default:0"`
	Status    string      `gorm:"not null;default:created"`
	CreatedAt time.Time   `gorm:"not null"`
	User      User        `gorm:"foreignKey:UserID"`
	Items     []OrderItem `gorm:"foreignKey:OrderID"`
}
