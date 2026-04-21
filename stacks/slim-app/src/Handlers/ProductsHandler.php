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
        $statement = $this->pdo->query('SELECT id, name, price FROM products ORDER BY id ASC');

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
