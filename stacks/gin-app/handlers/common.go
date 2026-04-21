package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

func bindJSON(c *gin.Context, payload any) bool {
	if err := c.ShouldBindJSON(payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"detail": "Invalid JSON"})
		return false
	}

	return true
}

func parseUintParam(c *gin.Context, name string) (uint, bool) {
	value, err := strconv.ParseUint(c.Param(name), 10, 64)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"detail": "Resource not found"})
		return 0, false
	}

	return uint(value), true
}
