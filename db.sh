
docker run -p 3306:3306 \
--detach \
--name=auth-db \
--env="MYSQL_ROOT_PASSWORD=password" \
--volume=/Users/dmsiegel/storage:/var/lib/mysql \
mysql:latest
