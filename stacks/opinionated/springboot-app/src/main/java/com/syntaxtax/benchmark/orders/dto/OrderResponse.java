package com.syntaxtax.benchmark.orders.dto;

import java.math.BigDecimal;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

public record OrderResponse(
    Long id,
    UserSummary user,
    List<OrderItemResponse> items,
    @JsonProperty("item_count")
    int itemCount,
    BigDecimal total,
    String status,
    @JsonProperty("created_at")
    String createdAt
) {
    public record UserSummary(
        Long id,
        String name
    ) {
    }

    public record OrderItemResponse(
        @JsonProperty("product_id")
        Long productId,
        @JsonProperty("product_name")
        String productName,
        Integer quantity,
        @JsonProperty("unit_price")
        BigDecimal unitPrice
    ) {
    }
}
