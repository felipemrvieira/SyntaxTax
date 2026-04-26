package com.syntaxtax.benchmark.orders.dto;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

public record CreateOrderRequest(
    @JsonProperty("user_id")
    @NotNull(message = "user_id is required")
    Long userId,

    @NotEmpty(message = "items must not be empty")
    List<@Valid CreateOrderItemRequest> items
) {
    public record CreateOrderItemRequest(
        @JsonProperty("product_id")
        @NotNull(message = "product_id is required")
        Long productId,

        @NotNull(message = "quantity is required")
        @Min(value = 1, message = "quantity must be greater than 0")
        Integer quantity
    ) {
    }
}
