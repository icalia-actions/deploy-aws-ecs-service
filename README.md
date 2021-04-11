# Deploy AWS ECS Service

Deploys a Task Definition as a Service in AWS ECS

## Usage

```yaml
      - name: Deploy AWS ECS Service
        uses: icalia-actions/deploy-aws-ecs-service@v0.0.1
        with:
          cluster: my-cluster
          deploy-aws-ecs-service: my-service
          template: templates/ecs/my-service.json

          # You can optionally specify the desired task count:
          desired-count: 1

          # If you provide a task definition template, it will get registered:
          task-definition-template-path: templates/ecs/my-task-definition.json

          # You can override the image used on any container - the most common
          # use case is to deploy an image built & pushed on a previous step:
          container-images: '{"my-container":"my-built-image"}'

          # You can optionally override any environment variable in the task 
          # container definitions, given that the overriden environment variable
          # already exists in the container definition:
          environment-vars: '{"FOO":"BAR"}'

          # If your service must be associated with a load balancer target group,
          # you can specify a Target Group ARN:
          target-group-arn: my-target-group-arn
```
