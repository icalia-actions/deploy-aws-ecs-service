import { info, getInput, setOutput, setFailed } from "@actions/core";
import { deployService, ServiceDeploymentInput } from "./service-deployment";
import {
  registerTaskDefinition,
  TaskRegistrationInput,
} from "@icalialabs/register-aws-ecs-task-definition";

export async function run(): Promise<number> {
  const name = getInput("name");
  const cluster = getInput("cluster");

  let desiredCount = parseInt(getInput("desired-count"));
  if (isNaN(desiredCount)) desiredCount = 1;

  info(`Registering task definition '${name}'...`);
  const { taskDefinitionArn } = await registerTaskDefinition({
    family: name,
    template: getInput("definition-template"),
    secrets: JSON.parse(getInput("secrets") || "null"),
    containerImages: JSON.parse(getInput("container-images") || "null"),
    environmentVars: JSON.parse(getInput("environment-vars") || "null"),
  } as TaskRegistrationInput);
  if (!taskDefinitionArn) throw new Error("Task definition failed to register");

  info(`Deploying service '${name}'...`);
  const deployedService = await deployService({
    name,
    cluster,
    desiredCount,
    template: getInput("template"),
    taskDefinition: taskDefinitionArn,
    loadBalancers: JSON.parse(getInput("load-balancers") || "null"),
    forceNewDeployment: getInput("force-new-deployment") == "true",
  } as ServiceDeploymentInput);
  const { serviceArn, clusterArn } = deployedService;
  const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION;

  info("Service Update Details:");
  info(`         Service Name: ${name}`);
  info(`          Cluster ARN: ${clusterArn}`);
  info(`          Service ARN: ${serviceArn}`);
  info(`  Task Definition ARN: ${taskDefinitionArn}`);
  info("");
  info(
    `Follow deployment progress at https://console.aws.amazon.com/ecs/v2/clusters/${cluster}/services/${name}/deployments?region=${region}`
  );
  info("");

  setOutput("service-arn", serviceArn);
  setOutput("task-definition-arn", taskDefinitionArn);

  return 0;
}
