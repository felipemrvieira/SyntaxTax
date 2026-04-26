package handlers

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

func bindJSON(c *gin.Context, payload any) bool {
	if err := c.ShouldBindJSON(payload); err != nil {
		var syntaxError *json.SyntaxError
		var typeError *json.UnmarshalTypeError

		switch {
		case errors.Is(err, io.EOF), errors.As(err, &syntaxError):
			c.JSON(http.StatusBadRequest, gin.H{"detail": "Invalid JSON"})
		case errors.As(err, &typeError):
			c.JSON(http.StatusUnprocessableEntity, gin.H{"detail": "Invalid request body"})
		default:
			c.JSON(http.StatusUnprocessableEntity, gin.H{"detail": "Invalid request body"})
		}

		return false
	}

	return true
}

func parseUintParam(c *gin.Context, name string) (uint, bool) {
	value, err := strconv.ParseUint(c.Param(name), 10, 64)
	if err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"detail": "Invalid resource id"})
		return 0, false
	}

	return uint(value), true
}
