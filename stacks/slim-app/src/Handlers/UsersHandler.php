<?php

declare(strict_types=1);

namespace App\Handlers;

use App\Support\JsonResponse;
use App\Support\RequestBody;
use PDO;
use PDOException;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class UsersHandler
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

        if (!is_string($payload['email'] ?? null) || trim($payload['email']) === '') {
            return JsonResponse::create($response, 422, ['detail' => "Field 'email' is required"]);
        }

        try {
            $statement = $this->pdo->prepare('INSERT INTO users (name, email) VALUES (:name, :email)');
            $statement->execute([
                'name' => $payload['name'],
                'email' => $payload['email'],
            ]);
        } catch (PDOException) {
            return JsonResponse::create($response, 422, ['detail' => 'Could not create user']);
        }

        return JsonResponse::create($response, 201, [
            'id' => (int) $this->pdo->lastInsertId(),
            'name' => $payload['name'],
            'email' => $payload['email'],
        ]);
    }

    public function list(Request $request, Response $response): Response
    {
        $statement = $this->pdo->query('SELECT id, name, email FROM users ORDER BY id ASC');

        return JsonResponse::create($response, 200, $statement->fetchAll());
    }

    public function show(Request $request, Response $response, array $args): Response
    {
        $user = $this->findUser((int) $args['id']);
        if ($user === null) {
            return JsonResponse::create($response, 404, ['detail' => 'User not found']);
        }

        return JsonResponse::create($response, 200, $user);
    }

    private function findUser(int $id): ?array
    {
        $statement = $this->pdo->prepare('SELECT id, name, email FROM users WHERE id = :id');
        $statement->execute(['id' => $id]);
        $user = $statement->fetch();

        return $user === false ? null : $user;
    }
}
