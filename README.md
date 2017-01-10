# Sample Authorization Service

A proof of concept authorization microservice. Communicates with API gateway
and other services via AMPQ and RabbitMQ.

## Build the Docker image

```
$ docker build -t <your username>/auth-service .
```
## Running dependencies

This service depends on the RabbitMQ broker and the host running the MySQL database. 

To run a dockerized broker:

```
$ docker run -d --hostname broker --name broker rabbitmq:3
```

And to run the container housing the MySQL instance:

```
$ docker run -p 3306:3306 -d --name=auth-db --env="MYSQL_ROOT_PASSWORD=password" --volume=/Users/<user name>/storage:/var/lib/mysql mysql:latest
```

Once the database is running, create and populate the `authorizations` database based on OLI sql scripts `createdb.sql` and 
`authorizations.sql`.

## Running the auth service

```
$ docker run -d --name auth-service  --link auth-db:mysql --link broker:my-rabbit  darrensiegel/auth-service
```
