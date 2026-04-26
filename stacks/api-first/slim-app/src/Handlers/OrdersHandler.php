<?php

declare(strict_types=1);

namespace App\Handlers;

use App\Support\JsonResponse;
use App\Support\RequestBody;
use PDO;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Throwable;

final class OrdersHandler
{
    private const VALID_STATUSES = ['created', 'paid', 'shipped', 'cancelled'];

    private const ALLOWED_STATUS_TRANSITIONS = [
        'created' => ['paid', 'cancelled'],
        'paid' => ['shipped', 'cancelled'],
        'shipped' => [],
        'cancelled' => [],
    ];

    public function __construct(private readonly PDO $pdo)
    {
    }

    public function create(Request $request, Response $response): Response
    {
        $payload = RequestBody::parse($request, $response);
        if ($payload instanceof Response) {
            return $payload;
        }

        if (!is_numeric($payload['user_id'] ?? null)) {
            return JsonResponse::create($response, 422, ['detail' => "Field 'user_id' is required"]);
        }

        if (!is_array($payload['items'] ?? null) || $payload['items'] === []) {
            return JsonResponse::create($response, 422, ['detail' => 'Order must contain at least one item']);
        }

        foreach ($payload['items'] as $item) {
            if (!is_array($item)) {
                return JsonResponse::create($response, 422, ['detail' => 'Each item must be an object']);
            }

            if (!is_numeric($item['product_id'] ?? null)) {
                return JsonResponse::create($response, 422, ['detail' => "Field 'product_id' is required"]);
            }

            if (!is_numeric($item['quantity'] ?? null) || (float) $item['quantity'] <= 0) {
                return JsonResponse::create($response, 422, ['detail' => "Field 'quantity' must be greater than zero"]);
            }
        }

        $user = $this->findUser((int) $payload['user_id']);
        if ($user === null) {
            return JsonResponse::create($response, 404, ['detail' => 'User not found']);
        }

        $productsById = [];
        foreach ($payload['items'] as $item) {
            $productId = (int) $item['product_id'];
            if (array_key_exists($productId, $productsById)) {
                continue;
            }

            $product = $this->findProduct($productId);
            if ($product === null) {
                return JsonResponse::create($response, 404, ['detail' => 'Product not found']);
            }

            $productsById[$productId] = $product;
        }

        $total = 0.0;
        foreach ($payload['items'] as $item) {
            $product = $productsById[(int) $item['product_id']];
            $total += (float) $product['price'] * (int) $item['quantity'];
        }

        $createdAt = gmdate('Y-m-d\TH:i:s\Z');

        try {
            $this->pdo->beginTransaction();

            $orderStatement = $this->pdo->prepare(
                'INSERT INTO orders (user_id, total, status, created_at) VALUES (:user_id, :total, :status, :created_at)'
            );
            $orderStatement->execute([
                'user_id' => (int) $payload['user_id'],
                'total' => $total,
                'status' => 'created',
                'created_at' => $createdAt,
            ]);

            $orderId = (int) $this->pdo->lastInsertId();
            $itemStatement = $this->pdo->prepare(
                'INSERT INTO order_items (order_id, product_id, quantity, unit_price)
                 VALUES (:order_id, :product_id, :quantity, :unit_price)'
            );

            foreach ($payload['items'] as $item) {
                $product = $productsById[(int) $item['product_id']];
                $itemStatement->execute([
                    'order_id' => $orderId,
                    'product_id' => (int) $item['product_id'],
                    'quantity' => (int) $item['quantity'],
                    'unit_price' => (float) $product['price'],
                ]);
            }

            $this->pdo->commit();
        } catch (Throwable) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }

            return JsonResponse::create($response, 500, ['detail' => 'Could not create order']);
        }

        $order = $this->findOrder($orderId);
        if ($order === null) {
            return JsonResponse::create($response, 500, ['detail' => 'Could not load order']);
        }

        return JsonResponse::create($response, 201, $order);
    }

    public function list(Request $request, Response $response): Response
    {
        $params = $request->getQueryParams();
        $conditions = [];
        $bindings = [];

        if (array_key_exists('status', $params)) {
            if (!is_string($params['status']) || !in_array($params['status'], self::VALID_STATUSES, true)) {
                return JsonResponse::create($response, 422, ['detail' => "Query parameter 'status' is invalid"]);
            }
            $conditions[] = 'status = :status';
            $bindings['status'] = $params['status'];
        }

        if (array_key_exists('user_id', $params)) {
            if (!is_numeric($params['user_id']) || (int) $params['user_id'] <= 0) {
                return JsonResponse::create($response, 422, ['detail' => "Query parameter 'user_id' is invalid"]);
            }
            $conditions[] = 'user_id = :user_id';
            $bindings['user_id'] = (int) $params['user_id'];
        }

        $sql = 'SELECT id FROM orders';
        if ($conditions !== []) {
            $sql .= ' WHERE ' . implode(' AND ', $conditions);
        }
        $sql .= ' ORDER BY id ASC';

        $statement = $this->pdo->prepare($sql);
        $statement->execute($bindings);

        $orders = [];
        foreach ($statement->fetchAll() as $row) {
            $order = $this->findOrder((int) $row['id']);
            if ($order !== null) {
                $orders[] = $order;
            }
        }

        return JsonResponse::create($response, 200, $orders);
    }

    public function show(Request $request, Response $response, array $args): Response
    {
        $order = $this->findOrder((int) $args['id']);
        if ($order === null) {
            return JsonResponse::create($response, 404, ['detail' => 'Order not found']);
        }

        return JsonResponse::create($response, 200, $order);
    }

    public function updateStatus(Request $request, Response $response, array $args): Response
    {
        $payload = RequestBody::parse($request, $response);
        if ($payload instanceof Response) {
            return $payload;
        }

        if (!is_string($payload['status'] ?? null) || trim($payload['status']) === '') {
            return JsonResponse::create($response, 422, ['detail' => "Field 'status' is required"]);
        }
        if (!in_array($payload['status'], self::VALID_STATUSES, true)) {
            return JsonResponse::create($response, 422, ['detail' => "Field 'status' is invalid"]);
        }

        $orderId = (int) $args['id'];
        $order = $this->findOrder($orderId);
        if ($order === null) {
            return JsonResponse::create($response, 404, ['detail' => 'Order not found']);
        }

        if (!in_array($payload['status'], self::ALLOWED_STATUS_TRANSITIONS[$order['status']], true)) {
            return JsonResponse::create($response, 409, ['detail' => 'Invalid order status transition']);
        }

        $statement = $this->pdo->prepare('UPDATE orders SET status = :status WHERE id = :id');
        $statement->execute([
            'status' => $payload['status'],
            'id' => $orderId,
        ]);

        $updatedOrder = $this->findOrder($orderId);
        if ($updatedOrder === null) {
            return JsonResponse::create($response, 500, ['detail' => 'Could not load order']);
        }

        return JsonResponse::create($response, 200, $updatedOrder);
    }

    private function findUser(int $id): ?array
    {
        $statement = $this->pdo->prepare('SELECT id, name, email FROM users WHERE id = :id');
        $statement->execute(['id' => $id]);
        $user = $statement->fetch();

        return $user === false ? null : $user;
    }

    private function findProduct(int $id): ?array
    {
        $statement = $this->pdo->prepare('SELECT id, name, price FROM products WHERE id = :id');
        $statement->execute(['id' => $id]);
        $product = $statement->fetch();

        return $product === false ? null : $product;
    }

    private function findOrder(int $id): ?array
    {
        $statement = $this->pdo->prepare(
            'SELECT o.id, o.total, o.status, o.created_at, u.id AS user_id, u.name AS user_name
             FROM orders o
             JOIN users u ON u.id = o.user_id
             WHERE o.id = :id'
        );
        $statement->execute(['id' => $id]);
        $order = $statement->fetch();

        if ($order === false) {
            return null;
        }

        $itemsStatement = $this->pdo->prepare(
            'SELECT oi.product_id, p.name AS product_name, oi.quantity, oi.unit_price
             FROM order_items oi
             JOIN products p ON p.id = oi.product_id
             WHERE oi.order_id = :order_id
             ORDER BY oi.id ASC'
        );
        $itemsStatement->execute(['order_id' => $id]);
        $items = array_map(
            static fn (array $item): array => [
                'product_id' => (int) $item['product_id'],
                'product_name' => $item['product_name'],
                'quantity' => (int) $item['quantity'],
                'unit_price' => (float) $item['unit_price'],
            ],
            $itemsStatement->fetchAll()
        );

        return [
            'id' => (int) $order['id'],
            'user' => [
                'id' => (int) $order['user_id'],
                'name' => $order['user_name'],
            ],
            'items' => $items,
            'item_count' => count($items),
            'total' => (float) $order['total'],
            'status' => $order['status'],
            'created_at' => $order['created_at'],
        ];
    }
}
