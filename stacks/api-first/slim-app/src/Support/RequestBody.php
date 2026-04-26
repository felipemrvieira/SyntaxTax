<?php

declare(strict_types=1);

namespace App\Support;

use JsonException;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class RequestBody
{
    public static function parse(Request $request, Response $response): array|Response
    {
        $body = (string) $request->getBody();
        if ($body === '') {
            return [];
        }

        try {
            $payload = json_decode($body, true, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            return JsonResponse::create($response, 400, ['detail' => 'Invalid JSON']);
        }

        if (!is_array($payload)) {
            return JsonResponse::create($response, 422, ['detail' => 'Body must be a JSON object']);
        }

        return $payload;
    }
}
