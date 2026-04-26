<?php

declare(strict_types=1);

use App\Db\Connection;

return Connection::open(dirname(__DIR__) . '/database.sqlite');
