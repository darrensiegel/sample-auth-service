
docker run -p 3306:3306 \
--detach \
--name=test-authdb \
--env="MYSQL_ROOT_PASSWORD=password" \
--volume=/Users/darrensiegel/storage:/var/lib/mysql \
mysql:latest
