import { info, getInput, setOutput, setFailed } from "@actions/core";
import { deployService, ServiceDeploymentInput } from "./service-deployment";
import {
  registerTaskDefinition,
  TaskRegistrationInput,
} from "@icalialabs/register-aws-ecs-task-definition";

export async function run(): Promise<number> {
  const cluster = getInput("cluster");
  const name = getInput("name");

  let desiredCount = parseInt(getInput("desired-count"));
  if (isNaN(desiredCount)) desiredCount = 1;

  const serviceDeploymentInput = {
    cluster,
    name,
    desiredCount,
    targetGroupArn: getInput("target-group-arn"),
    template: getInput("template"),
    forceNewDeployment: getInput("force-new-deployment") == "true",
  } as ServiceDeploymentInput;

  const taskRegistrationInput = {
    family: name,
    templatePath: getInput("definition-template"),
    containerImages: JSON.parse(getInput("container-images") || "null"),
    environmentVars: JSON.parse(getInput("environment-vars") || "null"),
  } as TaskRegistrationInput;

  info(`Registering task definition '${name}'...`);
  const { taskDefinitionArn } = await registerTaskDefinition(
    taskRegistrationInput
  );
  if (!taskDefinitionArn) throw new Error("Task definition failed to register");

  serviceDeploymentInput.taskDefinition = taskDefinitionArn;

  info(`Deploying service '${name}'...`);
  const deployedService = await deployService(serviceDeploymentInput);
  const { serviceArn, clusterArn } = deployedService;
  const region = process.env.AWS_DEFAULT_REGION;

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
