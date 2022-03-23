import * as fs from "fs";
import { parse } from "yaml";

import ECS, {
  Service,
  CreateServiceRequest,
  UpdateServiceRequest,
  LoadBalancers,
  Integer,
} from "aws-sdk/clients/ecs";
import { exit } from "process";

export interface ServiceDeploymentInput {
  name: string;
  cluster?: string;
  desiredCount?: Integer;
  template?: string;
  taskDefinition?: string;
  loadBalancers?: LoadBalancers;
  forceNewDeployment?: boolean;
}

function getClient(): ECS {
  return new ECS({
    customUserAgent: "icalia-actions/aws-action",
    region: process.env.AWS_DEFAULT_REGION,
  });
}

function readServiceDefinitionTemplate(
  input: ServiceDeploymentInput
): CreateServiceRequest | undefined {
  const { template } = input;
  if (!template || !fs.existsSync(template)) return;

  const templateContents = fs.readFileSync(template, "utf8");
  return parse(templateContents);
}

function processServiceDeployInput(
  input: ServiceDeploymentInput
): CreateServiceRequest {
  let serviceToDeploy = readServiceDefinitionTemplate(input);
  if (!serviceToDeploy) serviceToDeploy = {} as CreateServiceRequest;

  const { cluster, desiredCount, taskDefinition, loadBalancers } = input;
  if (cluster) serviceToDeploy.cluster = cluster;
  if (desiredCount) serviceToDeploy.desiredCount = desiredCount;
  if (taskDefinition) serviceToDeploy.taskDefinition = taskDefinition;
  if (loadBalancers) serviceToDeploy.loadBalancers = loadBalancers;

  return serviceToDeploy;
}

function processServiceCreateInput(
  input: ServiceDeploymentInput
): CreateServiceRequest {
  const { name } = input;
  let serviceToCreate = processServiceDeployInput(input);
  if (!serviceToCreate) throw new Error("Incomplete service create input");

  if (name) serviceToCreate.serviceName = name;
  return serviceToCreate;
}

function processServiceUpdateInput(
  input: ServiceDeploymentInput
): UpdateServiceRequest {
  const { name } = input;
  const {
    cluster,
    desiredCount,
    taskDefinition,
    capacityProviderStrategy,
    deploymentConfiguration,
    networkConfiguration,
    placementConstraints,
    placementStrategy,
    platformVersion,
    healthCheckGracePeriodSeconds,
    enableExecuteCommand,
  } = processServiceDeployInput(input);

  return {
    cluster,
    desiredCount,
    taskDefinition,
    service: name,
    capacityProviderStrategy,
    deploymentConfiguration,
    networkConfiguration,
    placementConstraints,
    placementStrategy,
    platformVersion,
    healthCheckGracePeriodSeconds,
    enableExecuteCommand,
  } as UpdateServiceRequest;
}

async function findService(
  input: ServiceDeploymentInput
): Promise<Service | undefined> {
  const ecs = getClient();
  const { cluster, name } = input;
  if (!name) return;

  const { services } = await ecs
    .describeServices({ cluster, services: [name] })
    .promise();
  if (!services || services.length < 1) return;

  return services[0];
}

async function updateService(input: ServiceDeploymentInput): Promise<Service> {
  const ecs = getClient();
  const serviceToUpdate = processServiceUpdateInput(input);
  const { service: updatedService } = await ecs
    .updateService(serviceToUpdate)
    .promise();
  if (!updatedService)
    throw new Error(
      `Service '${serviceToUpdate.service}' could not be updated`
    );

  return updatedService;
}

async function createService(input: ServiceDeploymentInput): Promise<Service> {
  const ecs = getClient();
  const serviceToCreate = processServiceCreateInput(input);
  const { serviceName } = serviceToCreate;

  const { service: createdService } = await ecs
    .createService(serviceToCreate)
    .promise();
  if (!createdService)
    throw new Error(`Service '${serviceName}' could not be created`);

  return createdService;
}

export async function deployService(
  input: ServiceDeploymentInput
): Promise<Service> {
  const serviceToDeploy = await findService(input);

  if (!serviceToDeploy || serviceToDeploy.status == "INACTIVE") {
    return createService(input);
  }

  return updateService(input);
}
