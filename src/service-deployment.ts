import * as fs from 'fs'
import { parse } from 'yaml'

import ECS, { Service, CreateServiceRequest, UpdateServiceRequest, Integer } from 'aws-sdk/clients/ecs'

export interface ServiceDeploymentInput {
  cluster?: string
  serviceName: string
  desiredCount?: Integer
  templatePath?: string
  taskDefinition?: string
  targetGroupArn?: string
  forceNewDeployment?: boolean
}

function getClient(): ECS {
  return new ECS({
    customUserAgent: 'icalia-actions/aws-action',
    region: process.env.AWS_DEFAULT_REGION
  })
}

function setServiceLoadBalancers(request: CreateServiceRequest, input: ServiceDeploymentInput): void {
  const { targetGroupArn } = input
  const { loadBalancers } = request
  if (!targetGroupArn || !loadBalancers) return

  loadBalancers
    .filter(lb => !lb['targetGroupArn'])
    .forEach(lb => { lb['targetGroupArn'] = targetGroupArn })
}

function readServiceDefinitionTemplate(input: ServiceDeploymentInput): CreateServiceRequest | undefined  {
  const { templatePath } = input
  if (!templatePath || !fs.existsSync(templatePath)) return

  const templateContents = fs.readFileSync(templatePath, 'utf8')
  return parse(templateContents)
}

function processServiceDeployInput(input: ServiceDeploymentInput): CreateServiceRequest {
  let serviceToDeploy = readServiceDefinitionTemplate(input)
  if (!serviceToDeploy) serviceToDeploy = {} as CreateServiceRequest

  const { cluster, desiredCount, taskDefinition } = input
  if (cluster) serviceToDeploy.cluster = cluster
  if (desiredCount) serviceToDeploy.desiredCount = desiredCount
  if (taskDefinition) serviceToDeploy.taskDefinition = taskDefinition

  return serviceToDeploy
}

function processServiceCreateInput(input: ServiceDeploymentInput): CreateServiceRequest {
  const { serviceName } = input
  let serviceToCreate = processServiceDeployInput(input)
  if (!serviceToCreate) throw new Error("Incomplete service create input")
  
  setServiceLoadBalancers(serviceToCreate, input)
  if (serviceName) serviceToCreate.serviceName = serviceName

  return serviceToCreate
}

function processServiceUpdateInput(input: ServiceDeploymentInput): UpdateServiceRequest {
  const { serviceName } = input
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
    enableExecuteCommand
  } = processServiceDeployInput(input)

  return {
    cluster,
    desiredCount,
    taskDefinition,
    service: serviceName,
    capacityProviderStrategy,
    deploymentConfiguration,
    networkConfiguration,
    placementConstraints,
    placementStrategy,
    platformVersion,
    healthCheckGracePeriodSeconds,
    enableExecuteCommand
  } as UpdateServiceRequest
}

async function findService(input: ServiceDeploymentInput): Promise<Service | undefined> {
  const ecs = getClient()
  const { cluster, serviceName } = input
  if (!serviceName) return

  const { services } = await ecs.describeServices({ cluster, services: [serviceName]}).promise()
  if (!services || services.length < 1) return
  
  return services[0]
}

async function updateService(input: ServiceDeploymentInput): Promise<Service> {
  const ecs = getClient()
  const serviceToUpdate = processServiceUpdateInput(input)
  const { service:updatedService } = await ecs.updateService(serviceToUpdate).promise()
  if (!updatedService) throw new Error(`Service '${serviceToUpdate.service}' could not be updated`)

  return updatedService
}

async function createService(input: ServiceDeploymentInput): Promise<Service> {
  const ecs = getClient()
  const serviceToCreate = processServiceCreateInput(input)
  const { serviceName } = serviceToCreate

  const { service:createdService } = await ecs.createService(serviceToCreate).promise()
  if (!createdService) throw new Error(`Service '${serviceName}' could not be created`)

  return createdService
}

export async function deployService(input: ServiceDeploymentInput): Promise<Service> {
  const serviceToDeploy = await findService(input)
  const deployMethod = (serviceToDeploy) ? updateService : createService
  return await deployMethod(input)
}