<?php

declare(strict_types=1);

namespace App\Db;

use PDO;

final class Connection
{
    public static function open(string $databasePath): PDO
    {
        $pdo = new PDO('sqlite:' . $databasePath);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        $pdo->exec('PRAGMA foreign_keys = ON');

        self::runMigrations($pdo, dirname($databasePath) . '/database/migrations');

        return $pdo;
    }

    private static function runMigrations(PDO $pdo, string $migrationsPath): void
    {
        $pdo->exec('CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY)');

        $files = glob($migrationsPath . '/*.sql');
        if ($files === false) {
            return;
        }

        sort($files, SORT_STRING);

        foreach ($files as $file) {
            $version = basename($file);
            $statement = $pdo->prepare('SELECT 1 FROM schema_migrations WHERE version = :version');
            $statement->execute(['version' => $version]);

            if ($statement->fetchColumn() !== false) {
                continue;
            }

            $sql = file_get_contents($file);
            if ($sql === false) {
                throw new \RuntimeException('Could not read migration file: ' . $file);
            }

            $pdo->beginTransaction();

            try {
                $pdo->exec($sql);
                $recordStatement = $pdo->prepare('INSERT INTO schema_migrations (version) VALUES (:version)');
                $recordStatement->execute(['version' => $version]);
                $pdo->commit();
            } catch (\Throwable $exception) {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }

                throw $exception;
            }
        }
    }
}
