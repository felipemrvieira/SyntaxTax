package com.syntaxtax.benchmark.orders;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrderRepository extends JpaRepository<Order, Long> {
    @EntityGraph(attributePaths = {"user", "items", "items.product"})
    List<Order> findAllByOrderByIdAsc();

    @Override
    @EntityGraph(attributePaths = {"user", "items", "items.product"})
    List<Order> findAll();

    @Override
    @EntityGraph(attributePaths = {"user", "items", "items.product"})
    Optional<Order> findById(Long id);
}
