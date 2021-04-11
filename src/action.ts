import { info, getInput, setOutput, setFailed } from "@actions/core";
import { deployService, ServiceDeploymentInput } from "./service-deployment";
import {
  registerTaskDefinition,
  TaskRegistrationInput,
} from "@icalialabs/register-aws-ecs-task-definition";

async function run(): Promise<number> {
  const cluster = getInput("cluster");
  const serviceName = getInput("service-name");

  let desiredCount = parseInt(getInput("desired-count"));
  if (isNaN(desiredCount)) desiredCount = 1;

  const serviceDeploymentInput = {
    cluster,
    serviceName,
    desiredCount,
    targetGroupArn: getInput("target-group-arn"),
    templatePath: getInput("service-template-path"),
    forceNewDeployment: getInput("force-new-deployment") == "true",
  } as ServiceDeploymentInput;

  const taskRegistrationInput = {
    family: serviceName,
    templatePath: getInput("task-definition-template-path"),
    containerImages: JSON.parse(getInput("container-images") || "null"),
    environmentVars: JSON.parse(getInput("environment-vars") || "null"),
  } as TaskRegistrationInput;

  info(`Registering task definition '${serviceName}'...`);
  const { taskDefinitionArn } = await registerTaskDefinition(
    taskRegistrationInput
  );
  if (!taskDefinitionArn) throw new Error("Task definition failed to register");

  serviceDeploymentInput.taskDefinition = taskDefinitionArn;

  info(`Deploying service '${serviceName}'...`);
  const deployedService = await deployService(serviceDeploymentInput);
  const { serviceArn, clusterArn } = deployedService;
  const region = process.env.AWS_DEFAULT_REGION;

  info("Service Update Details:");
  info(`         Service Name: ${serviceName}`);
  info(`          Cluster ARN: ${clusterArn}`);
  info(`          Service ARN: ${serviceArn}`);
  info(`  Task Definition ARN: ${taskDefinitionArn}`);
  info("");
  info(
    `Follow deployment progress at https://console.aws.amazon.com/ecs/v2/clusters/${cluster}/services/${serviceName}/deployments?region=${region}`
  );
  info("");

  setOutput("service-arn", serviceArn);
  setOutput("task-definition-arn", taskDefinitionArn);

  return 0;
}
