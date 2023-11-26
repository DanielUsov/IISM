# IISM

## Запуск проекта:

```sh
docker compose up --build
```

### Преходим в контейнер с базой данных в новом терменале:

```sh
docker exec -it iism-cassandra-1 cqlsh
```

Выполняем следующие команды:

```sh
CREATE KEYSPACE IF NOT EXISTS test_keyspace WITH replication = {'class': 'SimpleStrategy', 'replication_factor' : 1};
```

```sh
DROP TABLE IF EXISTS test_keyspace.users;
```

```sh
CREATE TABLE IF NOT EXISTS test_keyspace.users (id UUID PRIMARY KEY, url text, name text, html text);
```

### Затем нужно перейти в директорию `database-service` и выполнить команду:

```sh
npm i
```

```sh
npm run start
```

### После чего в новом терменале нужно перейти в директорию `parser` и прописать команду:

```sh
npm i
```

```sh
npm run start
```
