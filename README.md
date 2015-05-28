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
