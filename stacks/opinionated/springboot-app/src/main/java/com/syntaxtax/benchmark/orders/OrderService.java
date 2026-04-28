package com.syntaxtax.benchmark.orders;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import com.syntaxtax.benchmark.orders.dto.CreateOrderRequest;
import com.syntaxtax.benchmark.orders.dto.OrderResponse;
import com.syntaxtax.benchmark.orders.dto.UpdateOrderStatusRequest;
import com.syntaxtax.benchmark.products.Product;
import com.syntaxtax.benchmark.products.ProductRepository;
import com.syntaxtax.benchmark.users.User;
import com.syntaxtax.benchmark.users.UserRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class OrderService {
    private static final Set<String> VALID_STATUSES = Set.of("created", "paid", "shipped", "cancelled");
    private static final Map<String, Set<String>> ALLOWED_STATUS_TRANSITIONS = Map.of(
        "created", Set.of("paid", "cancelled"),
        "paid", Set.of("shipped", "cancelled"),
        "shipped", Set.of(),
        "cancelled", Set.of()
    );

    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;

    public OrderService(
        OrderRepository orderRepository,
        UserRepository userRepository,
        ProductRepository productRepository
    ) {
        this.orderRepository = orderRepository;
        this.userRepository = userRepository;
        this.productRepository = productRepository;
    }

    @Transactional
    public OrderResponse create(CreateOrderRequest request) {
        if (request.items() == null || request.items().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "items must not be empty");
        }

        User user = userRepository.findById(request.userId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        List<Long> productIds = request.items().stream()
            .map(CreateOrderRequest.CreateOrderItemRequest::productId)
            .distinct()
            .toList();

        Map<Long, Product> productsById = productRepository.findAllById(productIds).stream()
            .collect(Collectors.toMap(Product::getId, Function.identity()));

        if (productsById.size() != productIds.size()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found");
        }

        BigDecimal total = request.items().stream()
            .map(item -> {
                if (item.quantity() == null || item.quantity() <= 0) {
                    throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "quantity must be greater than 0");
                }
                Product product = productsById.get(item.productId());
                return product.getPrice().multiply(BigDecimal.valueOf(item.quantity()));
            })
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        Order order = new Order(user, total, "created", Instant.now());
        for (CreateOrderRequest.CreateOrderItemRequest item : request.items()) {
            Product product = productsById.get(item.productId());
            order.addItem(new OrderItem(product, item.quantity(), product.getPrice()));
        }

        Order savedOrder = orderRepository.save(order);
        Order detailedOrder = orderRepository.findById(savedOrder.getId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found"));

        return toResponse(detailedOrder);
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> list(String status, String userId) {
        Long parsedUserId = null;
        if (status != null && !VALID_STATUSES.contains(status)) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Query parameter 'status' is invalid");
        }
        if (userId != null) {
            try {
                parsedUserId = Long.valueOf(userId);
            } catch (NumberFormatException exception) {
                throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Query parameter 'user_id' is invalid");
            }
            if (parsedUserId <= 0 || !parsedUserId.toString().equals(userId)) {
                throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Query parameter 'user_id' is invalid");
            }
        }

        Long finalUserId = parsedUserId;
        return orderRepository.findAllByOrderByIdAsc().stream()
            .filter(order -> status == null || order.getStatus().equals(status))
            .filter(order -> finalUserId == null || order.getUser().getId().equals(finalUserId))
            .map(this::toResponse)
            .toList();
    }

    @Transactional(readOnly = true)
    public OrderResponse get(Long id) {
        Order order = orderRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found"));
        return toResponse(order);
    }

    @Transactional
    public OrderResponse updateStatus(Long id, UpdateOrderStatusRequest request) {
        Order order = orderRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found"));
        if (!VALID_STATUSES.contains(request.status())) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Field 'status' is invalid");
        }
        if (!ALLOWED_STATUS_TRANSITIONS.getOrDefault(order.getStatus(), Set.of()).contains(request.status())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Invalid order status transition");
        }
        order.setStatus(request.status());
        return toResponse(order);
    }

    private OrderResponse toResponse(Order order) {
        return new OrderResponse(
            order.getId(),
            new OrderResponse.UserSummary(order.getUser().getId(), order.getUser().getName()),
            order.getItems().stream()
                .map(item -> new OrderResponse.OrderItemResponse(
                    item.getProduct().getId(),
                    item.getProduct().getName(),
                    item.getQuantity(),
                    item.getUnitPrice()
                ))
                .toList(),
            order.getItems().size(),
            order.getTotal(),
            order.getStatus(),
            order.getCreatedAt().toString()
        );
    }
}
