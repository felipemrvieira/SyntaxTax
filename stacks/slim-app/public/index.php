<?php

declare(strict_types=1);

require __DIR__ . '/../vendor/autoload.php';

$app = require __DIR__ . '/../config/app.php';
$pdo = require __DIR__ . '/../config/dependencies.php';
$routes = require __DIR__ . '/../config/routes.php';

$routes($app, $pdo);
$app->run();
