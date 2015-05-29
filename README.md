# How to MySQL import

Install and connect as root:

```sh
brew install mysql
mysqld
sudo mysql
```

Create database and user:

```sql
CREATE DATABASE schoolofwok_new;
CREATE USER 'sow'@'localhost' IDENTIFIED BY 'sow';
GRANT ALL ON schoolofwok_new.* TO 'sow'@'localhost';
```

Import db dump:

```sh
mysql -u sow -p -h localhost schoolofwok_new < sqlbak.23.05.2015.sql
```

# How to run the migration

After running the MySQL import, configure the migration by adding a `config/runtime.json`.

You'll need to add MySQL and MongoDB URLs. For development your MySQL URL will probably be `mysql://sow:sow@localhost/schoolofwok_new` (as dictated by the scripts in the "How to MySQL import" section) and your dev MongoDB URL will probably be `mongodb://localhost/sow-api-dev`.

Install dependencies:

```sh
npm install
```

Ensure both databases are running:

```sh
brew install mongodb mysql
mongod
mysqld
```

Run the migration:

```sh
npm start
```
