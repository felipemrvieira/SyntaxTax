package com.syntaxtax.benchmark.orders;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
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
    public List<OrderResponse> list() {
        return orderRepository.findAllByOrderByIdAsc().stream()
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
                    item.getQuantity(),
                    item.getUnitPrice()
                ))
                .toList(),
            order.getTotal(),
            order.getStatus(),
            order.getCreatedAt().toString()
        );
    }
}
