package com.syntaxtax.benchmark.orders.dto;

import jakarta.validation.constraints.NotBlank;

public record UpdateOrderStatusRequest(
    @NotBlank(message = "status is required")
    String status
) {
}
