import * as tl from 'azure-pipelines-task-lib';
import SystemVariable from './SystemVariable';
import BuildVariable from './BuildVariable';
import InputVariable from './InputVariable';

export default class TaskVariable {
    private _system: SystemVariable = new SystemVariable();
    private _build: BuildVariable = new BuildVariable();
    private _input: InputVariable = new InputVariable();

    public get system(): SystemVariable {
        return this._system;
    }

    public get build(): BuildVariable {
        return this._build;
    }

    public get input(): InputVariable {
        return this._input;
    }

    public load(): void {
        this.loadSystem();
        this.loadBuild();
        this.loadInput();
    }

    private loadSystem(): void {
        this._system.collectionUri = tl.getVariable('System.TeamFoundationCollectionUri');
        this._system.teamProject = tl.getVariable('System.TeamProject');
        this._system.accessToken = tl.getVariable('System.AccessToken');
    }

    private loadBuild(): void {
        this._build.buildId = Number(tl.getVariable('Build.BuildId'));
        this._build.buildNumber = tl.getVariable('Build.BuildNumber');
        this._build.definitionName = tl.getVariable('Build.DefinitionName');
    }

    private loadInput(): void {
        this._input.filePath = tl.getPathInput('filePath', true, false);
    }
}