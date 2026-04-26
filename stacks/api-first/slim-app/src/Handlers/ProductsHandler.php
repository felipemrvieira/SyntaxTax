<?php

declare(strict_types=1);

namespace App\Handlers;

use App\Support\JsonResponse;
use App\Support\RequestBody;
use PDO;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class ProductsHandler
{
    public function __construct(private readonly PDO $pdo)
    {
    }

    public function create(Request $request, Response $response): Response
    {
        $payload = RequestBody::parse($request, $response);
        if ($payload instanceof Response) {
            return $payload;
        }

        if (!is_string($payload['name'] ?? null) || trim($payload['name']) === '') {
            return JsonResponse::create($response, 422, ['detail' => "Field 'name' is required"]);
        }

        if (!is_numeric($payload['price'] ?? null)) {
            return JsonResponse::create($response, 422, ['detail' => "Field 'price' must be numeric"]);
        }
        if ((float) $payload['price'] <= 0) {
            return JsonResponse::create($response, 422, ['detail' => "Field 'price' must be greater than zero"]);
        }

        $statement = $this->pdo->prepare('INSERT INTO products (name, price) VALUES (:name, :price)');
        $statement->execute([
            'name' => $payload['name'],
            'price' => (float) $payload['price'],
        ]);

        return JsonResponse::create($response, 201, [
            'id' => (int) $this->pdo->lastInsertId(),
            'name' => $payload['name'],
            'price' => (float) $payload['price'],
        ]);
    }

    public function list(Request $request, Response $response): Response
    {
        $params = $request->getQueryParams();
        $conditions = [];
        $bindings = [];

        if (array_key_exists('min_price', $params)) {
            if (!is_numeric($params['min_price']) || (float) $params['min_price'] <= 0) {
                return JsonResponse::create($response, 422, ['detail' => "Query parameter 'min_price' is invalid"]);
            }
            $conditions[] = 'price >= :min_price';
            $bindings['min_price'] = (float) $params['min_price'];
        }

        if (array_key_exists('max_price', $params)) {
            if (!is_numeric($params['max_price']) || (float) $params['max_price'] <= 0) {
                return JsonResponse::create($response, 422, ['detail' => "Query parameter 'max_price' is invalid"]);
            }
            $conditions[] = 'price <= :max_price';
            $bindings['max_price'] = (float) $params['max_price'];
        }

        $sql = 'SELECT id, name, price FROM products';
        if ($conditions !== []) {
            $sql .= ' WHERE ' . implode(' AND ', $conditions);
        }
        $sql .= ' ORDER BY id ASC';

        $statement = $this->pdo->prepare($sql);
        $statement->execute($bindings);

        return JsonResponse::create($response, 200, $statement->fetchAll());
    }

    public function show(Request $request, Response $response, array $args): Response
    {
        $product = $this->findProduct((int) $args['id']);
        if ($product === null) {
            return JsonResponse::create($response, 404, ['detail' => 'Product not found']);
        }

        return JsonResponse::create($response, 200, $product);
    }

    private function findProduct(int $id): ?array
    {
        $statement = $this->pdo->prepare('SELECT id, name, price FROM products WHERE id = :id');
        $statement->execute(['id' => $id]);
        $product = $statement->fetch();

        return $product === false ? null : $product;
    }
}
