# Deploy AWS ECS Service

Deploys a Task Definition as a Service in AWS ECS

## Usage

```yaml
      - name: Deploy AWS ECS Service
        uses: icalia-actions/deploy-aws-ecs-service@v0.0.1
        with:
          name: my-service
          cluster: my-cluster
          template: templates/ecs/my-service.json

          # You can optionally specify the desired task count:
          desired-count: 1

          # If you provide a task definition template, it will get registered:
          definition-template: templates/ecs/my-task-definition.json

          # You can override the image used on any container - the most common
          # use case is to deploy an image built & pushed on a previous step:
          container-images: '{"my-container":"my-built-image"}'

          # You can optionally override any environment variable in the task 
          # container definitions, given that the overriden environment variable
          # already exists in the container definition:
          environment-vars: '{"FOO":"BAR"}'

          # You can also override secrets already defined in the "secrets" key
          # inside the container definition by using a map consisting of the
          # "name" as key, and the "valueFrom" as the value - the secret name
          # *must* be present in the definition, otherwise it will be ignored.
          secrets: '{"MY_SECRET":"some-secret-name"}'

          # If your service must be associated with any number of load
          # balancers, you can specify those using a JSON array:
          load-balancers: |-
            [
              {
                "targetGroupArn":"my-target-group-arn",
                "containerName":"my-container-name",
                "containerPort":3000
              },
              {
                "loadBalancerName":"my-classic-load-balancer",
                "containerName":"my-container-name",
                "containerPort":3000
              }
            ]
```
