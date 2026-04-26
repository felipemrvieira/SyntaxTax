package db

import (
	"database/sql"
	"os"
	"path/filepath"
	"runtime"
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

	sqlDB, err := db.DB()
	if err != nil {
		return nil, err
	}

	if err := runMigrations(sqlDB); err != nil {
		return nil, err
	}

	return db, nil
}

func runMigrations(db *sql.DB) error {
	if _, err := db.Exec(`CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY)`); err != nil {
		return err
	}

	_, filename, _, ok := runtime.Caller(0)
	if !ok {
		return os.ErrNotExist
	}

	files, err := filepath.Glob(filepath.Join(filepath.Dir(filename), "migrations", "*.sql"))
	if err != nil {
		return err
	}

	for _, file := range files {
		version := filepath.Base(file)
		var applied string
		err = db.QueryRow(`SELECT version FROM schema_migrations WHERE version = ?`, version).Scan(&applied)
		if err == nil {
			continue
		}
		if err != sql.ErrNoRows {
			return err
		}

		sqlBytes, readErr := os.ReadFile(file)
		if readErr != nil {
			return readErr
		}

		tx, beginErr := db.Begin()
		if beginErr != nil {
			return beginErr
		}

		if _, execErr := tx.Exec(string(sqlBytes)); execErr != nil {
			_ = tx.Rollback()
			return execErr
		}

		if _, insertErr := tx.Exec(`INSERT INTO schema_migrations (version) VALUES (?)`, version); insertErr != nil {
			_ = tx.Rollback()
			return insertErr
		}

		if commitErr := tx.Commit(); commitErr != nil {
			return commitErr
		}
	}

	return nil
}
