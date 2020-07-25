import * as codepipeline from '@aws-cdk/aws-codepipeline';
import * as codepipeline_actions from '@aws-cdk/aws-codepipeline-actions';
import { Construct, SecretValue, Stack, StackProps } from '@aws-cdk/core';
import { CdkPipeline, SimpleSynthAction } from "@aws-cdk/pipelines";
import { CdkpipelinesDemoStage } from './cdkpipelines-demo-stage';
import { ManualApprovalAction } from '@aws-cdk/aws-codepipeline-actions';


/**
 * The stack that defines the application pipeline
 */
export class CdkpipelinesDemoPipelineStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const sourceArtifact = new codepipeline.Artifact();
    const cloudAssemblyArtifact = new codepipeline.Artifact();
 
    const pipeline = new CdkPipeline(this, 'Pipeline', {
      // The pipeline name
      pipelineName: 'DemoServicePipeline',
      cloudAssemblyArtifact,

      // Where the source can be found
      sourceAction: new codepipeline_actions.GitHubSourceAction({
        actionName: 'GitHub',
        output: sourceArtifact,
        oauthToken: SecretValue.secretsManager('github-token'),
        owner: 'ReidWeb',
        repo: 'cdk-pipelines-lab',
        trigger: codepipeline_actions.GitHubTrigger.WEBHOOK,
      }),

       // How it will be built and synthesized
       synthAction: SimpleSynthAction.standardNpmSynth({
         sourceArtifact,
         cloudAssemblyArtifact,
         
         // We need a build step to compile the TypeScript Lambda
         buildCommand: 'npm run build'
       }),
    });

    let devStage = new CdkpipelinesDemoStage(this, 'Sandbox', {
      env: { account: '863920247840', region: 'eu-west-1' } //Sandbox acc
    });
    // This is where we add the application stages
    pipeline.addApplicationStage(devStage).addActions(new ManualApprovalAction({
      actionName: "sandbox to dev promotion",
      externalEntityLink: devStage.urlOutput.toString()
    }));

    pipeline.addApplicationStage(new CdkpipelinesDemoStage(this, 'Dev', {
      env: { account: '857501034047', region: 'eu-west-1' } //Dev acc
    }));

  }
}