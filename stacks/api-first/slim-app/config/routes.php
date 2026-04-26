<?php

declare(strict_types=1);

use App\Handlers\OrdersHandler;
use App\Handlers\ProductsHandler;
use App\Handlers\UsersHandler;
use Slim\App;

return static function (App $app, \PDO $pdo): void {
    $usersHandler = new UsersHandler($pdo);
    $productsHandler = new ProductsHandler($pdo);
    $ordersHandler = new OrdersHandler($pdo);

    $app->post('/users', [$usersHandler, 'create']);
    $app->get('/users', [$usersHandler, 'list']);
    $app->get('/users/{id}', [$usersHandler, 'show']);

    $app->post('/products', [$productsHandler, 'create']);
    $app->get('/products', [$productsHandler, 'list']);
    $app->get('/products/{id}', [$productsHandler, 'show']);

    $app->post('/orders', [$ordersHandler, 'create']);
    $app->get('/orders', [$ordersHandler, 'list']);
    $app->get('/orders/{id}', [$ordersHandler, 'show']);
    $app->patch('/orders/{id}/status', [$ordersHandler, 'updateStatus']);
};
